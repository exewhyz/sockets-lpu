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
const users = new Map();
const messages = [];

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  socket.on("send_message", (message) => {
    const newMessage = {
      from: message.userName,
      to: message.to,
      time: new Date(Date.now()).toLocaleString(),
      message: message.data,
    };
    messages.push(newMessage);

    // Send to recipient
    const recipientSocketId = users.get(message.to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receive_message", newMessage);
    }

    // Send to sender so they see their own message
    socket.emit("receive_message", newMessage);
  });
  socket.on("join", (userName) => {
    // Check if username already exists
    if (users.has(userName)) {
      socket.emit("join_error", {
        message: "Username already taken. Please choose a different name.",
      });
      return;
    }

    users.set(userName, socket.id);
    socket.userName = userName;
    socket.emit("join_success");
    io.emit("users", Array.from(users.keys()));
    socket.emit("message_history", messages);
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
      io.emit("users", Array.from(users.keys()));
      socket.userName = null;
    }
  });

  socket.on("disconnect", () => {
    if (socket.userName) {
      users.delete(socket.userName);
      console.log("User disconnected:", socket.userName);
    }
    io.emit("users", Array.from(users.keys()));
  });
});

app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});

server.listen(PORT, () =>
  console.log(`Server listening on  http://localhost:${PORT}`),
);
