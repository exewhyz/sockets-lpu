import { io } from "socket.io-client";

const URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

const socket = io(URL, {
  transports: ['polling', 'websocket'],
  reconnectionDelayMax: 10000,
  reconnectionAttempts: 5,
})

export default socket;