import socket from "./utils/socket";
import { useState, useEffect, useRef } from "react";
import "./App.css";

const App = () => {
  const SEND_MESSAGE = "send_message";
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [userName, setUserName] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    <div className="app-container">
      {!isConnected ? (
        <div className="login-container">
          <div className="login-card">
            <h1>💬 Chat App</h1>
            <p>Enter your name to start chatting</p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                minLength={3}
                required
                className="login-input"
              />
              <button type="submit" className="login-button">Join Chat</button>
            </form>
          </div>
        </div>
      ) : (
        <div className="chat-container">
          <div className="sidebar">
            <div className="sidebar-header">
              <h2>💬 Chats</h2>
              <div className="current-user">
                <span className="user-badge">{userName}</span>
              </div>
            </div>
            <div className="users-list">
              {users.filter(u => u !== userName).length === 0 ? (
                <div className="no-users">No other users online</div>
              ) : (
                users.filter(u => u !== userName).map((user) => (
                  <div 
                    key={user}
                    className={`user-item ${selectedUser === user ? 'active' : ''}`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="user-avatar">{user.charAt(0).toUpperCase()}</div>
                    <div className="user-info">
                      <div className="user-name">{user}</div>
                      <div className="user-status">Online</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="chat-area">
            {selectedUser ? (
              <>
                <div className="chat-header">
                  <div className="chat-header-user">
                    <div className="user-avatar">{selectedUser.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="chat-title">{selectedUser}</div>
                      <div className="chat-status">Online</div>
                    </div>
                  </div>
                </div>

                <div className="messages-container">
                  {messages
                    .filter(msg => 
                      (msg.from === userName && msg.to === selectedUser) ||
                      (msg.from === selectedUser && msg.to === userName)
                    )
                    .map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`message ${msg.from === userName ? 'sent' : 'received'}`}
                      >
                        <div className="message-bubble">
                          <div className="message-text">{msg.message}</div>
                          <div className="message-time">{msg.time}</div>
                        </div>
                      </div>
                    ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="message-input-container">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Message ${selectedUser}...`}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="message-input"
                  />
                  <button 
                    onClick={sendMessage} 
                    disabled={!messageText.trim()}
                    className="send-button"
                  >
                    📤
                  </button>
                </div>
              </>
            ) : (
              <div className="no-chat-selected">
                <div className="no-chat-content">
                  <h2>💬</h2>
                  <p>Select a user to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
