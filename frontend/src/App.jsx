import socket from "./utils/socket";

const App = () => {
  const SEND_MESSAGE = "send_message";

  const sendMessage = () => {
    socket.emit(SEND_MESSAGE, "hello");
  };

  socket.on("receive_message", (message) => {
    console.log(message);
  })

  return <div>
    <button onClick={sendMessage}>Send Message</button>
  </div>;
};

export default App;
