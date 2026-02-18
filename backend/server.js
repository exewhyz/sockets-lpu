import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import connectDB from "./config/database.js";
import User from "./models/User.js";
import Message from "./models/Message.js";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Map of online users: userName -> socketId
const users = new Map();

io.on("connection", (socket) => {
  socket.on("send_message", async (message) => {
    try {
      // Save message to database
      const newMessage = await Message.create({
        from: message.userName,
        to: message.to,
        message: message.data,
        status: "sent",
      });

      const messageData = {
        id: newMessage._id.toString(),
        from: newMessage.from,
        to: newMessage.to,
        time: new Date(newMessage.createdAt).toLocaleString(),
        message: newMessage.message,
        status: newMessage.status,
      };

      // Send to recipient if online
      const recipientSocketId = users.get(message.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receive_message", messageData);
        // Update status to delivered
        newMessage.status = "delivered";
        await newMessage.save();
        messageData.status = "delivered";
        // Notify sender about delivery
        socket.emit("message_delivered", { messageId: messageData.id });
      }

      // Send to sender so they see their own message
      socket.emit("receive_message", messageData);
    } catch (error) {
      console.error("Error saving message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("join", async ({ userName, password }) => {
    try {
      // Validate input
      if (!userName || !password) {
        socket.emit("join_error", {
          message: "Username and password are required.",
        });
        return;
      }

      // Find user in database
      let user = await User.findOne({ name: userName });

      if (user) {
        // Check if user has no password (created before password feature)
        if (!user.password) {
          // Update old user with new password
          user.password = password;
          user.socketId = socket.id;
          user.online = true;
          user.lastSeen = new Date();
          await user.save();
        } else {
          // Existing user with password - verify it
          const isPasswordValid = await user.comparePassword(password);

          if (!isPasswordValid) {
            socket.emit("join_error", {
              message: "Incorrect password.",
            });
            return;
          }

          // Check if user is already online (in another session)
          if (user.online && users.has(userName)) {
            socket.emit("join_error", {
              message: "This account is already logged in from another device.",
            });
            return;
          }

          // Update existing user (successful login)
          user.socketId = socket.id;
          user.online = true;
          user.lastSeen = new Date();
          await user.save();
        }
      } else {
        // New user - create account
        user = await User.create({
          name: userName,
          password: password,
          socketId: socket.id,
          online: true,
          lastSeen: new Date(),
        });
      }

      users.set(userName, socket.id);
      socket.userName = userName;

      socket.emit("join_success");

      // Get all users from database
      const allUsers = await User.find({}).lean();
      const userList = allUsers.map((u) => ({
        name: u.name,
        online: u.online,
        lastSeen: u.lastSeen,
      }));

      io.emit("users", userList);

      // Get message history
      const messageHistory = await Message.find({
        $or: [{ from: userName }, { to: userName }],
      })
        .sort({ createdAt: 1 })
        .lean();

      const formattedMessages = messageHistory.map((msg) => ({
        id: msg._id.toString(),
        from: msg.from,
        to: msg.to,
        time: new Date(msg.createdAt).toLocaleString(),
        message: msg.message,
        status: msg.status,
      }));

      socket.emit("message_history", formattedMessages);

      // Mark undelivered messages as delivered
      const undeliveredMessages = await Message.find({
        to: userName,
        status: "sent",
      });

      for (const msg of undeliveredMessages) {
        msg.status = "delivered";
        await msg.save();

        // Notify original sender
        const senderSocketId = users.get(msg.from);
        if (senderSocketId) {
          io.to(senderSocketId).emit("message_delivered", {
            messageId: msg._id.toString(),
          });
        }
      }
    } catch (error) {
      console.error("Error in join event:", error);
      socket.emit("join_error", { message: "Failed to join chat" });
    }
  });

  socket.on("messages_read", async ({ from, to }) => {
    try {
      // Update message status to read
      const result = await Message.updateMany(
        { from, to, status: { $ne: "read" } },
        { status: "read" },
      );

      if (result.modifiedCount > 0) {
        // Get updated message IDs
        const updatedMessages = await Message.find({ from, to, status: "read" })
          .select("_id")
          .lean();

        const messageIds = updatedMessages.map((m) => m._id.toString());

        // Notify sender that messages were read
        const senderSocketId = users.get(from);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messages_read", { messageIds });
        }
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  socket.on("typing", ({ from, to }) => {
    const recipientSocketId = users.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("typing", { from });
    }
  });

  socket.on("stop_typing", ({ from, to }) => {
    const recipientSocketId = users.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("stop_typing", { from });
    }
  });

  socket.on("leave", async () => {
    if (socket.userName) {
      try {
        users.delete(socket.userName);

        // Update user status in database
        await User.findOneAndUpdate(
          { name: socket.userName },
          {
            online: false,
            lastSeen: new Date(),
            socketId: null,
          },
        );

        // Send updated user list
        const allUsers = await User.find({}).lean();
        const userList = allUsers.map((u) => ({
          name: u.name,
          online: u.online,
          lastSeen: u.lastSeen,
        }));
        io.emit("users", userList);

        socket.userName = null;
      } catch (error) {
        console.error("Error in leave event:", error);
      }
    }
  });

  socket.on("disconnect", async () => {
    if (socket.userName) {
      try {
        users.delete(socket.userName);

        // Update user status in database
        await User.findOneAndUpdate(
          { name: socket.userName },
          {
            online: false,
            lastSeen: new Date(),
            socketId: null,
          },
        );

        // Send updated user list
        const allUsers = await User.find({}).lean();
        const userList = allUsers.map((u) => ({
          name: u.name,
          online: u.online,
          lastSeen: u.lastSeen,
        }));
        io.emit("users", userList);
      } catch (error) {
        console.error("Error in disconnect event:", error);
      }
    }
  });
});

app.get("/", (req, res) => {
  res.send("<h1>Chat App Backend with MongoDB</h1>");
});

// Health check endpoint
app.get("/health", async (req, res) => {
  const mongoose = (await import("mongoose")).default;
  res.json({
    status: "ok",
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

server.listen(PORT, async () => {
  await connectDB();
  console.log(`Server listening on  http://localhost:${PORT}`);
});
