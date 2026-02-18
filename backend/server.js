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

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  socket.on("send_message", (message) => {
    const newMessage = {
      from : message.userName,
      time: new Date(Date.now()).toLocaleString(),
      message : message.data
    }
    io.to(socket.id).emit("receive_message", newMessage);
  });
  socket.on("join", (userName) => {
    users.set(userName, socket.id);
    io.emit("users", Array.from(users.keys()));
  });
  socket.on("disconnect", () => {
    users.delete(socket.id);
    io.emit("users", Array.from(users.keys()));
  })
});

app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});

server.listen(PORT, () =>
  console.log(`Server listening on  http://localhost:${PORT}`),
);