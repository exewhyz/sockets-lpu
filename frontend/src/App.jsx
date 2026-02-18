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
import { Send, MessageCircle, LogOut, Check } from "lucide-react";
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
  const [password, setPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [messageText, setMessageText] = useState("");
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Helper function to format last seen time
  const formatLastSeen = (lastSeenISO) => {
    if (!lastSeenISO) return "";
    const now = new Date();
    const lastSeen = new Date(lastSeenISO);
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastSeen.toLocaleDateString();
  };

  // Helper function to render message status ticks
  const renderMessageTicks = (status) => {
    if (status === "sent") {
      // Single gray tick
      return <Check className="w-3 h-3 inline-block ml-1" />;
    } else if (status === "delivered") {
      // Double gray ticks
      return (
        <span className="inline-flex ml-1">
          <Check className="w-3 h-3 -mr-1.5" />
          <Check className="w-3 h-3" />
        </span>
      );
    } else if (status === "read") {
      // Double blue ticks
      return (
        <span className="inline-flex ml-1 text-red-700">
          <Check className="w-3 h-3 -mr-1.5" />
          <Check className="w-3 h-3" />
        </span>
      );
    }
    return null;
  };

  // Get selected user object
  const selectedUserObj = users.find((u) => u.name === selectedUser);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when new messages arrive in current conversation
  useEffect(() => {
    if (selectedUser && isConnected) {
      socket.emit("messages_read", { from: selectedUser, to: userName });
    }
  }, [messages, selectedUser, userName, isConnected]);

  useEffect(() => {
    scrollToBottom();
    // Clear typing timeout when switching users
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    // Mark messages as read when viewing conversation
    if (selectedUser && isConnected) {
      socket.emit("messages_read", { from: selectedUser, to: userName });
    }
  }, [selectedUser, userName, isConnected]);

  useEffect(() => {
    socket.on("receive_message", (message) => {
      setMessages((prev) => [...prev, message]);
    });
    socket.on("users", (usersData) => {
      setUsers(usersData);
    });
    socket.on("message_history", (history) => {
      setMessages(history);
    });
    socket.on("connect", () => {
      // Socket connected
    });
    socket.on("join_success", () => {
      setIsConnected(true);
    });
    socket.on("join_error", (error) => {
      alert(error.message);
      setPassword("");
      socket.disconnect();
    });
    socket.on("typing", ({ from }) => {
      setTypingUsers((prev) => new Set(prev).add(from));
    });
    socket.on("stop_typing", ({ from }) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(from);
        return newSet;
      });
    });
    socket.on("message_delivered", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: "delivered" } : msg
        )
      );
    });
    socket.on("messages_read", ({ messageIds }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg.id) ? { ...msg, status: "read" } : msg
        )
      );
    });

    return () => {
      socket.off("receive_message");
      socket.off("users");
      socket.off("message_history");
      socket.off("connect");
      socket.off("join_success");
      socket.off("join_error");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off("message_delivered");
      socket.off("messages_read");
    };
  }, []);

  const sendMessage = () => {
    if (!messageText.trim() || !selectedUser) return;

    // Clear typing timeout and emit stop_typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socket.emit("stop_typing", { from: userName, to: selectedUser });

    socket.emit(SEND_MESSAGE, {
      userName,
      to: selectedUser,
      data: messageText,
    });
    setMessageText("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userName || !password) return;

    // Reconnect socket if it was disconnected
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join", { userName, password });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = (value) => {
    setMessageText(value);

    if (!selectedUser || !value.trim()) {
      // Stop typing if no text or no user selected
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      socket.emit("stop_typing", { from: userName, to: selectedUser });
      return;
    }

    // Emit typing event
    socket.emit("typing", { from: userName, to: selectedUser });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { from: userName, to: selectedUser });
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleDisconnect = () => {
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    // Emit leave event before disconnecting
    socket.emit("leave");
    socket.disconnect();
    setIsConnected(false);
    setUserName("");
    setPassword("");
    setSelectedUser("");
    setMessages([]);
    setUsers([]);
    setTypingUsers(new Set());
    setShowDisconnectDialog(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-linear-to-br from-sky-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-sky-950 dark:to-cyan-950">
      {!isConnected ? (
        <div className="flex items-center justify-center h-full w-full p-4">
          <Card className="w-full max-w-md shadow-2xl border-2 border-sky-200 dark:border-sky-900 bg-linear-to-br from-white to-sky-50 dark:from-gray-900 dark:to-sky-950">
            <CardHeader className="text-center space-y-2">
              <div className="flex justify-center mb-2">
                <MessageCircle className="h-16 w-16 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">
                Welcome to Chat App
              </CardTitle>
              <CardDescription className="text-base">
                Login or create a new account to start chatting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Username"
                    minLength={3}
                    required
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
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
                  Login / Sign Up
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <SidebarProvider defaultOpen={true} className="h-full">
          {/* <div className="flex h-full w-full bg-background"> */}
          {/* Sidebar */}
          <Sidebar collapsible="icon" variant="inset" className="border-r">
            <SidebarHeader className="border-b bg-linear-to-r from-sky-600 to-cyan-600 text-white">
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
                  All Users
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {users.filter((u) => u.name !== userName).length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm group-data-[collapsible=icon]:hidden">
                        No other users
                      </div>
                    ) : (
                      users
                        .filter((u) => u.name !== userName)
                        .map((user) => (
                          <SidebarMenuItem key={user.name}>
                            <SidebarMenuButton
                              onClick={() => setSelectedUser(user.name)}
                              isActive={selectedUser === user.name}
                              className="h-auto py-3 group-data-[collapsible=icon]:justify-center"
                              tooltip={user.name}
                            >
                              <Avatar className="h-9 w-9 shrink-0 relative">
                                <AvatarFallback className={`${
                                  user.online
                                    ? "bg-linear-to-br from-sky-500 to-cyan-500"
                                    : "bg-linear-to-br from-gray-400 to-gray-500"
                                } text-white font-semibold text-sm`}>
                                  {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                                {user.online && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                                )}
                              </Avatar>
                              <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                                <span className="font-semibold text-sm">
                                  {user.name}
                                </span>
                                {user.online ? (
                                  typingUsers.has(user.name) ? (
                                    <span className="text-xs text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1">
                                      typing
                                      <span className="flex gap-0.5">
                                        <span className="w-1 h-1 bg-sky-600 dark:bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1 h-1 bg-sky-600 dark:bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1 h-1 bg-sky-600 dark:bg-sky-400 rounded-full animate-bounce"></span>
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                      ● Online
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatLastSeen(user.lastSeen)}
                                  </span>
                                )}
                              </div>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t bg-linear-to-r from-sky-50 to-cyan-50 dark:from-gray-800 dark:to-sky-900 p-4">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setShowDisconnectDialog(true)}
                    className="h-11 hover:bg-destructive/10 group-data-[collapsible=icon]:justify-center"
                    tooltip="Disconnect"
                  >
                    <Avatar className="h-9 w-9 shrink-0 group-data-[collapsible=icon]:hidden">
                      <AvatarFallback className="bg-linear-to-br from-cyan-600 to-sky-600 text-white font-semibold text-sm">
                        {userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <LogOut className="h-5 w-5 text-red-600 dark:text-red-400 hidden group-data-[collapsible=icon]:block" />
                    <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                      <span className="font-semibold text-sm">{userName}</span>
                      <span className="text-xs text-muted-foreground">
                        Click to disconnect
                      </span>
                    </div>
                    <LogOut className="ml-auto h-4 w-4 text-red-600 dark:text-red-400 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
          </Sidebar>
          {/* Main Chat Area */}
          <SidebarInset>
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-linear-to-r from-white to-sky-50 dark:from-gray-900 dark:to-sky-950 px-4">
                  <SidebarTrigger />
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10 relative">
                      <AvatarFallback className={`${
                        selectedUserObj?.online
                          ? "bg-linear-to-br from-sky-500 to-cyan-500"
                          : "bg-linear-to-br from-gray-400 to-gray-500"
                      } text-white font-semibold`}>
                        {selectedUser.charAt(0).toUpperCase()}
                      </AvatarFallback>
                      {selectedUserObj?.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                      )}
                    </Avatar>
                    <div>
                      <h2 className="font-semibold text-lg">{selectedUser}</h2>
                      {selectedUserObj?.online ? (
                        typingUsers.has(selectedUser) ? (
                          <p className="text-xs text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1">
                            typing
                            <span className="flex gap-0.5">
                              <span className="w-1 h-1 bg-sky-600 dark:bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span className="w-1 h-1 bg-sky-600 dark:bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span className="w-1 h-1 bg-sky-600 dark:bg-sky-400 rounded-full animate-bounce"></span>
                            </span>
                          </p>
                        ) : (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            ● Online
                          </p>
                        )
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatLastSeen(selectedUserObj?.lastSeen)}
                        </p>
                      )}
                    </div>
                  </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden bg-linear-to-b from-sky-50/50 to-cyan-50/30 dark:from-gray-900 dark:to-sky-950/30">
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
                              className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md ${
                                msg.from === userName
                                  ? "bg-linear-to-br from-sky-500 to-cyan-600 text-white rounded-br-sm"
                                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm border border-sky-200 dark:border-sky-800"
                              }`}
                            >
                              <p className="text-sm wrap-break-word leading-relaxed">
                                {msg.message}
                              </p>
                              <p className="text-[0.65rem] opacity-70 mt-1 text-right flex items-center justify-end gap-1">
                                <span>{msg.time}</span>
                                {msg.from === userName && renderMessageTicks(msg.status)}
                              </p>
                            </div>
                          </div>
                        ))}
                      {typingUsers.has(selectedUser) && selectedUserObj?.online && (
                        <div className="flex justify-start animate-in fade-in duration-200">
                          <div className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl px-4 py-3 shadow-md border border-sky-200 dark:border-sky-800 rounded-bl-sm">
                            <div className="flex items-center gap-1">
                              <div className="flex gap-1 ml-1">
                                <div className="size-1 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="size-1 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="size-1 bg-sky-500 rounded-full animate-bounce"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </div>

                {/* Message Input */}
                <div className="shrink-0 border-t bg-white dark:bg-gray-900 p-4">
                  {!selectedUserObj?.online && (
                    <div className="mb-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
                      {selectedUser} is offline. Your message will be delivered when they come online.
                    </div>
                  )}
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
                      onChange={(e) => handleTyping(e.target.value)}
                      placeholder={`Message ${selectedUser}...`}
                      onKeyDown={handleKeyPress}
                      className="flex-1 h-11"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!messageText.trim()}
                      className="h-11 w-11 shrink-0 bg-linear-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <>
                {/* Header with Sidebar Trigger */}
                <header className="flex h-16 shrink-{/* 0 items-center gap-2 border-b bg-linear-to-r from-white to-sky-50 dark:from-gray-900 dark:to-sky-950 px-4">
                  <SidebarTrigger />
                  <h2 className="font-semibold text-lg text-muted-foreground">
                    Chat App
                  </h2>
                </header>
                <div className="flex-1 flex items-center justify-center bg-linear-to-b from-sky-50/50 to-cyan-50/30 dark:from-gray-900 dark:to-sky-950/30">
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
              </>
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
                  chat history might lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDisconnect}
                  variant="destructive"
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
