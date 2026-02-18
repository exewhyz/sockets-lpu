import express from "express";
import http from "http";
import { Server } from "socket.io";

const PORT = 4000;

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Map of online users: userName -> socketId
const users = new Map();

// Map of all users with their status: userName -> { socketId, online, lastSeen }
const allUsers = new Map();

const messages = [];

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  socket.on("send_message", (message) => {
    const newMessage = {
      id: `${Date.now()}_${Math.random()}`,
      from: message.userName,
      to: message.to,
      time: new Date(Date.now()).toLocaleString(),
      message: message.data,
      status: 'sent', // sent, delivered, read
    };
    messages.push(newMessage);

    // Send to recipient if online
    const recipientSocketId = users.get(message.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receive_message", newMessage);
      newMessage.status = 'delivered';
      // Notify sender about delivery
      socket.emit("message_delivered", { messageId: newMessage.id });
    }
    // If recipient is offline, message stays in history and will be sent when they rejoin

    // Send to sender so they see their own message
    socket.emit("receive_message", newMessage);
  });
  socket.on("join", (userName) => {
    // Check if username is taken by an online user
    if (users.has(userName)) {
      socket.emit("join_error", {
        message: "Username already taken. Please choose a different name.",
      });
      return;
    }

    // Register user as online
    users.set(userName, socket.id);
    allUsers.set(userName, {
      socketId: socket.id,
      online: true,
      lastSeen: null,
    });
    socket.userName = userName;

    socket.emit("join_success");
    
    // Send full user list with status
    const userList = Array.from(allUsers.entries()).map(([name, data]) => ({
      name,
      online: data.online,
      lastSeen: data.lastSeen,
    }));
    io.emit("users", userList);
    
    // Send message history (includes all messages, even those received while offline)
    socket.emit("message_history", messages);
    
    // Mark undelivered messages as delivered
    messages.forEach((msg) => {
      if (msg.to === userName && msg.status === 'sent') {
        msg.status = 'delivered';
        // Notify original sender
        const senderSocketId = users.get(msg.from);
        if (senderSocketId) {
          io.to(senderSocketId).emit("message_delivered", { messageId: msg.id });
        }
      }
    });
  });

  socket.on("messages_read", ({ from, to }) => {
    // Mark messages as read
    const updatedMessages = messages.filter(
      (msg) => msg.from === from && msg.to === to && msg.status !== 'read'
    );
    
    updatedMessages.forEach((msg) => {
      msg.status = 'read';
    });
    
    // Notify the sender
    const senderSocketId = users.get(from);
    if (senderSocketId && updatedMessages.length > 0) {
      io.to(senderSocketId).emit("messages_read", {
        from,
        to,
        messageIds: updatedMessages.map(m => m.id)
      });
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

  socket.on("leave", () => {
    if (socket.userName) {
      users.delete(socket.userName);
      console.log("User left:", socket.userName);
      
      // Mark user as offline
      if (allUsers.has(socket.userName)) {
        allUsers.set(socket.userName, {
          socketId: null,
          online: false,
          lastSeen: new Date().toISOString(),
        });
      }
      
      // Send updated user list
      const userList = Array.from(allUsers.entries()).map(([name, data]) => ({
        name,
        online: data.online,
        lastSeen: data.lastSeen,
      }));
      io.emit("users", userList);
      
      socket.userName = null;
    }
  });

  socket.on("disconnect", () => {
    if (socket.userName) {
      users.delete(socket.userName);
      console.log("User disconnected:", socket.userName);
      
      // Mark user as offline
      if (allUsers.has(socket.userName)) {
        allUsers.set(socket.userName, {
          socketId: null,
          online: false,
          lastSeen: new Date().toISOString(),
        });
      }
      
      // Send updated user list
      const userList = Array.from(allUsers.entries()).map(([name, data]) => ({
        name,
        online: data.online,
        lastSeen: data.lastSeen,
      }));
      io.emit("users", userList);
    }
  });
});

app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});

server.listen(PORT, () =>
  console.log(`Server listening on  http://localhost:${PORT}`),
);
