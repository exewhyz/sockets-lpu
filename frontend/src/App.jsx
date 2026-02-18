import socket from "./utils/socket";
import { useState, useEffect } from "react";

const App = () => {
  const SEND_MESSAGE = "send_message";
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    socket.on("receive_message", (message) => {
      setMessages((prev) => [...prev, message]);
    });
    socket.on("users", (usersData) => {
      setUsers(usersData);
    });

    return () => {
      socket.off("receive_message");
      socket.off("users");
    }

  }, []);

  const sendMessage = () => {
    socket.emit(SEND_MESSAGE, {
      userName,
      data: "Hello",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userName) return;
    socket.emit("join", userName);
    setIsConnected(true);
  };

  return (
    <div>
      {!isConnected && (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            minLength={3}
            required
          />
          <button>Join Chat</button>
        </form>
      )}

      {messages?.length === 0 ? (
        <p>No messages</p>
      ) : (
        messages?.map((msg, idx) => <div key={idx}>{msg.message} : {msg.from} : {msg.time}</div>)
      )}
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
};

export default App;
