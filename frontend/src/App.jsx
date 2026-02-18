import socket from "./utils/socket";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Send, MessageCircle, Menu, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";

const App = () => {
  const SEND_MESSAGE = "send_message";
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [userName, setUserName] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [messageText, setMessageText] = useState("");
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
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
    };
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

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDisconnect = () => {
    socket.disconnect();
    setIsConnected(false);
    setUserName("");
    setSelectedUser("");
    setMessages([]);
    setUsers([]);
    setShowDisconnectDialog(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-linear-to-br from-primary/20 via-primary/10 to-accent/20">
      {!isConnected ? (
        <div className="flex items-center justify-center h-full w-full p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center space-y-2">
              <div className="flex justify-center mb-2">
                <MessageCircle className="h-16 w-16 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">
                Welcome to Chat App
              </CardTitle>
              <CardDescription className="text-base">
                Enter your name to start chatting with others
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Your name"
                    minLength={3}
                    required
                    className="h-12 text-base"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  size="lg"
                >
                  Join Chat
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <SidebarProvider defaultOpen={true}>
          {/* <div className="flex h-full w-full bg-background"> */}
          {/* Sidebar */}
          <Sidebar collapsible="icon" variant="inset" className="border-r">
            <SidebarHeader className="border-b bg-primary text-primary-foreground">
              <div className="flex items-center gap-2 px-2 py-2">
                <MessageCircle className="h-5 w-5" />
                <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
                  Chats
                </span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                  Online Users
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {users.filter((u) => u !== userName).length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm group-data-[collapsible=icon]:hidden">
                        No other users online
                      </div>
                    ) : (
                      users
                        .filter((u) => u !== userName)
                        .map((user) => (
                          <SidebarMenuItem key={user}>
                            <SidebarMenuButton
                              onClick={() => setSelectedUser(user)}
                              isActive={selectedUser === user}
                              className="h-auto py-3 group-data-[collapsible=icon]:justify-center"
                              tooltip={user}
                            >
                              <Avatar className="h-9 w-9 shrink-0">
                                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                                  {user.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                                <span className="font-semibold text-sm">
                                  {user}
                                </span>
                                <span className="text-xs text-green-600 dark:text-green-500">
                                  ● Online
                                </span>
                              </div>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t bg-card p-4">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setShowDisconnectDialog(true)}
                    className="h-11 hover:bg-destructive/10 group-data-[collapsible=icon]:justify-center"
                    tooltip="Disconnect"
                  >
                    <Avatar className="h-9 w-9 shrink-0 group-data-[collapsible=icon]:hidden">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                        {userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <LogOut className="h-5 w-5 text-destructive hidden group-data-[collapsible=icon]:block" />
                    <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                      <span className="font-semibold text-sm">{userName}</span>
                      <span className="text-xs text-muted-foreground">
                        Click to disconnect
                      </span>
                    </div>
                    <LogOut className="ml-auto h-4 w-4 text-destructive group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
          </Sidebar>
          {/* Main Chat Area */}
          <SidebarInset className="flex flex-col h-screen overflow-hidden">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-card px-4">
                  <SidebarTrigger />
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {selectedUser.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold text-lg">{selectedUser}</h2>
                      <p className="text-xs text-green-600 dark:text-green-500 font-medium">
                        ● Online
                      </p>
                    </div>
                  </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden bg-muted/30">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      {messages
                        .filter(
                          (msg) =>
                            (msg.from === userName &&
                              msg.to === selectedUser) ||
                            (msg.from === selectedUser && msg.to === userName),
                        )
                        .map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex animate-in slide-in-from-bottom-2 duration-300 ${
                              msg.from === userName
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                                msg.from === userName
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-card text-card-foreground rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm wrap-break-word leading-relaxed">
                                {msg.message}
                              </p>
                              <p className="text-[0.65rem] opacity-70 mt-1 text-right">
                                {msg.time}
                              </p>
                            </div>
                          </div>
                        ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </div>

                {/* Message Input */}
                <div className="shrink-0 border-t bg-card p-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={`Message ${selectedUser}...`}
                      onKeyDown={handleKeyPress}
                      className="flex-1 h-11"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!messageText.trim()}
                      className="h-11 w-11 shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-muted/30">
                <div className="text-center text-muted-foreground space-y-4">
                  <MessageCircle className="h-24 w-24 mx-auto opacity-20" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      No Conversation Selected
                    </h3>
                    <p className="text-sm">
                      Select a user from the sidebar to start chatting
                    </p>
                  </div>
                </div>
              </div>
            )}
          </SidebarInset>
          {/* </div> */}
          {/* Disconnect Confirmation Dialog */}
          <AlertDialog
            open={showDisconnectDialog}
            onOpenChange={setShowDisconnectDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect from chat?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be signed out and returned to the login screen. Your
                  chat history will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDisconnect}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SidebarProvider>
      )}
    </div>
  );
};

export default App;
