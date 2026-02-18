import socket from "./utils/socket";
import { useState, useEffect } from "react";

const App = () => {
  const SEND_MESSAGE = "send_message";
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [userName, setUserName] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    socket.on("receive_message", (message) => {
      console.log("Received message:", message);
      setMessages((prev) => [...prev, message]);
    });
    socket.on("users", (usersData) => {
      console.log("Received users:", usersData);
      setUsers(usersData);
    });
    socket.on("message_history", (history) => {
      console.log("Received message history:", history);
      setMessages(history);
    });
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    return () => {
      socket.off("receive_message");
      socket.off("users");
      socket.off("message_history");
      socket.off("connect");
    }

  }, []);

  const sendMessage = () => {
    if (!messageText.trim() || !selectedUser) return;
    
    socket.emit(SEND_MESSAGE, {
      userName,
      to: selectedUser,
      data: messageText,
    });
    setMessageText("");
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
            placeholder="Enter your name"
            minLength={3}
            required
          />
          <button>Join Chat</button>
        </form>
      )}

      {isConnected && (
        <>
          <h3>Connected Users ({users.length}):</h3>
          <p>{users.join(", ") || "No users connected"}</p>
          
          <h3>Select User to Message:</h3>
          <select 
            value={selectedUser} 
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="">-- Select a user --</option>
            {users.filter(u => u !== userName).map((user) => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>

          <div style={{ marginTop: '20px' }}>
            <h3>Messages:</h3>
            {messages?.length === 0 ? (
              <p>No messages</p>
            ) : (
              messages
                ?.filter(msg => msg.from === userName || msg.to === userName)
                .map((msg, idx) => (
                  <div key={idx} style={{ padding: '5px', borderBottom: '1px solid #ccc' }}>
                    <strong>{msg.from}</strong> → <strong>{msg.to}</strong>: {msg.message}
                    <br />
                    <small>{msg.time}</small>
                  </div>
                ))
            )}
          </div>

          <div style={{ marginTop: '20px' }}>
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message"
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} disabled={!selectedUser || !messageText.trim()}>
              Send Message
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
