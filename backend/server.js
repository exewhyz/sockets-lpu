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

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  socket.on("send_message", (message) => {
    io.emit("receive_message", message);
  })

});

app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});

server.listen(PORT, () =>
  console.log(`Server listening on  http://localhost:${PORT}`),
);
