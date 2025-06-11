import React, { useEffect, useState, useCallback } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { motion } from "framer-motion";
import {
  Avatar,
  Box,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
  useMediaQuery,
  Badge,
  Skeleton,
  Snackbar,
} from "@mui/material";
import { Search as SearchIcon, ArrowBack } from "@mui/icons-material";
import { message } from "antd";
import MessageContainer from "../components/MessageContainer";
import MessageInput from "../components/MessageInput";
import {
  conversationsAtom,
  selectedConversationAtom,
} from "../atoms/messagesAtom";
import userAtom from "../atoms/userAtom";
import { useSocket } from "../context/SocketContext";

const ConversationItem = React.memo(
  ({ conversation, selectedConversation, setSelectedConversation, onlineUsers }) => {
    if (!conversation?.participants?.[0]?._id || !conversation.lastMessage) {
      console.warn("Invalid conversation skipped:", conversation);
      return null;
    }

    return (
      <motion.div
        key={conversation._id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ListItem
          sx={{
            "&:hover": { bgcolor: "#2a2a2a" },
            py: { xs: 1, sm: 1.2, md: 1.5 },
            cursor: "pointer",
            bgcolor:
              selectedConversation._id === conversation._id ? "#333333" : "transparent",
          }}
          onClick={() =>
            setSelectedConversation({
              _id: conversation._id,
              userId: conversation.participants[0]._id,
              username: conversation.participants[0].username,
              userProfilePic: conversation.participants[0].profilePic,
              isOnline: onlineUsers.includes(conversation.participants[0]._id),
              mock: conversation.mock || false,
            })
          }
          role="button"
          aria-label={`Select chat with ${conversation.participants[0].username}`}
        >
          <ListItemAvatar>
            <Badge
              color="success"
              variant="dot"
              invisible={!onlineUsers.includes(conversation.participants[0]._id)}
            >
              <Avatar
                src={conversation.participants[0].profilePic}
                sx={{ width: { xs: 36, sm: 40, md: 48 }, height: { xs: 36, sm: 40, md: 48 } }}
              />
            </Badge>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" },
                    fontWeight: conversation.lastMessage.seen ? "normal" : "bold",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {conversation.participants[0].username}
                </Typography>
                {conversation.unreadCount > 0 && (
                  <Badge
                    badgeContent={conversation.unreadCount}
                    color="primary"
                    sx={{ "& .MuiBadge-badge": { bgcolor: "#8515fe" } }}
                  />
                )}
              </Box>
            }
            secondary={
              <Typography
                noWrap
                variant="body2"
                color="#b0b0b0"
                sx={{
                  fontSize: { xs: "0.7rem", sm: "0.75rem", md: "0.875rem" },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {conversation.lastMessage.text || "No messages yet"}{" "}
                {conversation.lastMessage.seen ? "" : "•"}
              </Typography>
            }
          />
        </ListItem>
      </motion.div>
    );
  }
);

const ChatPage = () => {
  const [searchingUser, setSearchingUser] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedConversation, setSelectedConversation] =
    useRecoilState(selectedConversationAtom);
  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const currentUser = useRecoilValue(userAtom);
  const { socket, onlineUsers } = useSocket();
  const isSmall = useMediaQuery("(max-width:600px)");
  const isMedium = useMediaQuery("(min-width:601px) and (max-width:960px)");
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!socket) {
      console.warn("Socket not initialized");
      return;
    }

    socket.emit("joinConversation", { conversationId: selectedConversation._id });

    const handleNewMessage = (message) => {
      console.log("Received newMessage:", message);
      setConversations((prev) => {
        const exists = prev.find((c) => c._id === message.conversationId);
        let updatedConversations = prev.map((conversation) =>
          conversation._id === message.conversationId
            ? {
                ...conversation,
                lastMessage: {
                  text: message.text || "Media",
                  sender: message.sender,
                  seen: message.sender._id === currentUser._id,
                  status: message.sender._id === currentUser._id ? "sent" : "delivered",
                },
                unreadCount:
                  message.sender._id !== currentUser._id &&
                  message.conversationId !== selectedConversation._id
                    ? (conversation.unreadCount || 0) + 1
                    : conversation.unreadCount || 0,
                updatedAt: new Date(message.createdAt || Date.now()),
              }
            : conversation
        );

        if (!exists) {
          updatedConversations = [
            {
              _id: message.conversationId,
              participants: [
                {
                  _id: message.sender._id,
                  username: message.sender.username,
                  profilePic: message.sender.profilePic,
                },
              ],
              lastMessage: {
                text: message.text || "Media",
                sender: message.sender,
                seen: message.sender._id === currentUser._id,
                status: message.sender._id === currentUser._id ? "sent" : "delivered",
              },
              unreadCount: message.sender._id !== currentUser._id ? 1 : 0,
              mock: false,
              updatedAt: new Date(message.createdAt || Date.now()),
            },
            ...updatedConversations,
          ];
        }

        return updatedConversations.sort(
          (a, b) => new Date(b.updatedAt || Date.now()) - new Date(a.updatedAt || Date.now())
        );
      });

      if (
        message.sender._id !== currentUser._id &&
        !selectedConversation._id
      ) {
        setSelectedConversation({
          _id: message.conversationId,
          userId: message.sender._id,
          username: message.sender.username,
          userProfilePic: message.sender.profilePic,
          isOnline: onlineUsers.includes(message.sender._id),
          mock: false,
        });
      }
    };

    const handleUpdateConversation = ({ conversationId, lastMessage }) => {
      console.log("Received updateConversation:", { conversationId, lastMessage });
      setConversations((prev) =>
        prev
          .map((conversation) =>
            conversation._id === conversationId
              ? {
                  ...conversation,
                  lastMessage: {
                    ...lastMessage,
                    sender:
                      typeof lastMessage.sender === "string"
                        ? { _id: lastMessage.sender }
                        : lastMessage.sender,
                    seen: lastMessage.seen || false,
                    status: lastMessage.status || "sent",
                  },
                  unreadCount:
                    lastMessage.sender._id !== currentUser._id &&
                    conversationId !== selectedConversation._id
                      ? (conversation.unreadCount || 0) + 1
                      : conversation.unreadCount || 0,
                  updatedAt: new Date(lastMessage.updatedAt || Date.now()),
                }
              : conversation
          )
          .sort((a, b) => new Date(b.updatedAt || Date.now()) - new Date(a.updatedAt || Date.now()))
      );
    };

    const handleNewMessageNotification = (notif) => {
      console.log("Received newMessageNotification:", notif);
      if (notif.conversationId !== selectedConversation._id) {
        setNotification({
          message: `New message from ${notif.sender.username}`,
          conversationId: notif.conversationId,
        });
      }
    };

    const handleMessagesSeen = ({ conversationId }) => {
      console.log("Received messagesSeen:", { conversationId });
      setConversations((prev) =>
        prev
          .map((conversation) =>
            conversation._id === conversationId
              ? {
                  ...conversation,
                  lastMessage: { ...conversation.lastMessage, seen: true, status: "seen" },
                  unreadCount: 0,
                  updatedAt: new Date(),
                }
              : conversation
          )
          .sort((a, b) => new Date(b.updatedAt || Date.now()) - new Date(a.updatedAt || Date.now()))
      );
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("updateConversation", handleUpdateConversation);
    socket.on("newMessageReceived", handleNewMessageNotification);
    socket.on("messagesSeen", handleMessagesSeen);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("updateConversation", handleUpdateConversation);
      socket.off("newMessageReceived", handleNewMessageNotification);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.emit("leaveConversation", { conversationId: selectedConversation._id });
    };
  }, [
    socket,
    setConversations,
    currentUser._id,
    selectedConversation._id,
    setSelectedConversation,
    onlineUsers,
  ]);

  useEffect(() => {
    const getConversations = async () => {
      try {
        setLoadingConversations(true);
        const res = await fetch("/api/messages/conversations", {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error(`Failed to fetch conversations: ${res.status}`);
        }
        const data = await res.json();
        if (data.error) {
          message.error(data.error);
          return;
        }
        const validConversations = data.filter(
          (conv) => conv.participants?.[0]?._id && conv.lastMessage
        );
        setConversations(validConversations.sort(
          (a, b) => new Date(b.updatedAt || Date.now()) - new Date(a.updatedAt || Date.now())
        ));
      } catch (error) {
        console.error("Get conversations error:", error);
        message.error("Failed to load chats");
      } finally {
        setLoadingConversations(false);
      }
    };
    getConversations();
  }, [setConversations]);

  useEffect(() => {
    return () => {
      setSelectedConversation({
        _id: "",
        userId: "",
        username: "",
        userProfilePic: "",
        isOnline: false,
        mock: false,
      });
      if (socket) {
        socket.emit("leaveConversation", { conversationId: selectedConversation._id });
      }
    };
  }, [socket, setSelectedConversation]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchText.trim()) return;
    setSearchingUser(true);
    try {
      const res = await fetch(`/api/users/profile/${searchText}`, {
        credentials: "include",
      });
      const searchedUser = await res.json();
      if (searchedUser.error) {
        message.error(searchedUser.error);
        return;
      }
      if (searchedUser._id === currentUser._id) {
        message.error("You cannot message yourself");
        return;
      }
      const conversationAlreadyExists = conversations.find(
        (conversation) => conversation.participants[0]._id === searchedUser._id
      );
      if (conversationAlreadyExists) {
        setSelectedConversation({
          _id: conversationAlreadyExists._id,
          userId: searchedUser._id,
          username: searchedUser.username,
          userProfilePic: searchedUser.profilePic,
          isOnline: onlineUsers.includes(searchedUser._id),
          mock: false,
        });
        return;
      }
      const mockConversation = {
        mock: true,
        lastMessage: { text: "", sender: "" },
        _id: `mock_${Date.now()}`,
        participants: [
          {
            _id: searchedUser._id,
            username: searchedUser.username,
            profilePic: searchedUser.profilePic,
          },
        ],
        unreadCount: 0,
        updatedAt: new Date(),
      };
      setConversations((prevConvs) => [...prevConvs, mockConversation]);
      setSelectedConversation({
        _id: mockConversation._id,
        userId: searchedUser._id,
        username: searchedUser.username,
        userProfilePic: searchedUser.profilePic,
        isOnline: onlineUsers.includes(searchedUser._id),
        mock: true,
      });
    } catch (error) {
      console.error("Search error:", error);
      message.error("Failed to search user");
    } finally {
      setSearchingUser(false);
      setSearchText("");
    }
  };

  const handleBack = useCallback(() => {
    setSelectedConversation({
      _id: "",
      userId: "",
      username: "",
      userProfilePic: "",
      isOnline: false,
      mock: false,
    });
  }, [setSelectedConversation]);

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const handleNotificationClick = () => {
    if (notification?.conversationId) {
      const conv = conversations.find((c) => c._id === notification.conversationId);
      if (conv) {
        setSelectedConversation({
          _id: conv._id,
          userId: conv.participants[0]._id,
          username: conv.participants[0].username,
          userProfilePic: conv.participants[0].profilePic,
          isOnline: onlineUsers.includes(conv.participants[0]._id),
          mock: false,
        });
      }
    }
    setNotification(null);
  };

  const navHeight = isSmall ? 56 : isMedium ? 60 : 64;
  const conversationListWidth = isSmall ? "100%" : isMedium ? "400px" : "600px";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        message={notification?.message}
        action={
          <IconButton
            size="small"
            aria-label="view"
            color="inherit"
            onClick={handleNotificationClick}
          >
            <Typography variant="body2">View</Typography>
          </IconButton>
        }
        sx={{ bgcolor: "#8515fe", color: "white" }}
      />
      <Box
        sx={{
          width: "100%",
          height: `calc(100vh - ${navHeight}px)`,
          display: "flex",
          flexDirection: isSmall ? "column" : "row",
          bgcolor: "#1a1a1a",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: conversationListWidth,
            height: isSmall ? "auto" : `calc(100vh - ${navHeight}px)`,
            display: isSmall && selectedConversation._id ? "none" : "flex",
            flexDirection: "column",
            bgcolor: "#222222",
            borderRight: isSmall ? "none" : "1px solid #333333",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              p: { xs: 1.5, sm: 2, md: 2.5 },
              bgcolor: "#8515fe",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" } }}
            >
              Chats
            </Typography>
          </Box>
          <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, flexShrink: 0 }}>
            <form onSubmit={handleSearch}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search chats..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                disabled={searchingUser}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#8515fe" }} />
                    </InputAdornment>
                  ),
                  sx: {
                    bgcolor: "#2e2e2e",
                    borderRadius: 20,
                    "& fieldset": { border: "none" },
                    color: "#8515fe",
                    "& input": { fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } },
                  },
                }}
                sx={{ bgcolor: "#2e2e2e", borderRadius: 20 }}
                aria-label="Search for chats"
              />
            </form>
          </Box>
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              "&::-webkit-scrollbar": {
                width: "6px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#A9A9A9",
                borderRadius: "3px",
              },
              "@supports (-moz-appearance:none)": {
                scrollbarWidth: "thin",
                scrollbarColor: "#A9A9A9 transparent",
              },
            }}
          >
            {loadingConversations ? (
              <List>
                {[0, 1, 2, 3].map((_, i) => (
                  <ListItem key={i} sx={{ py: { xs: 0.8, sm: 1, md: 1.2 } }}>
                    <ListItemAvatar>
                      <Skeleton
                        variant="circular"
                        width={isSmall ? 36 : isMedium ? 40 : 48}
                        height={isSmall ? 36 : isMedium ? 40 : 48}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Skeleton variant="text" width="60%" />}
                      secondary={<Skeleton variant="text" width="40%" />}
                    />
                  </ListItem>
                ))}
              </List>
            ) : conversations.length === 0 ? (
              <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography
                  color="#b0b0b0"
                  sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem", md: "1rem" } }}
                >
                  No chats found. Search for users to start a conversation.
                </Typography>
              </Box>
            ) : (
              <List>
                {conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation._id}
                    conversation={conversation}
                    selectedConversation={selectedConversation}
                    setSelectedConversation={setSelectedConversation}
                    onlineUsers={onlineUsers}
                  />
                ))}
              </List>
            )}
          </Box>
        </Box>
        {selectedConversation._id && selectedConversation.userId && typeof selectedConversation.userId === "string" && selectedConversation.userId.trim() !== "" ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              height: `calc(100vh - ${navHeight}px)`,
              bgcolor: "#1a1a1a",
              overflow: "hidden",
            }}
          >
            {isSmall && (
              <Box
                sx={{
                  p: { xs: 1, sm: 1.5 },
                  bgcolor: "#8515fe",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                  height: "56px",
                }}
              >
                <IconButton
                  onClick={handleBack}
                  sx={{ color: "white" }}
                  aria-label="Back to chat list"
                >
                  <ArrowBack />
                </IconButton>
                <Badge
                  color="success"
                  variant="dot"
                  invisible={!selectedConversation.isOnline}
                  sx={{ mr: 1 }}
                >
                  <Avatar
                    src={selectedConversation.userProfilePic}
                    sx={{ width: 32, height: 32 }}
                  />
                </Badge>
                <Typography
                  variant="h6"
                  sx={{ fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" } }}
                >
                  {selectedConversation.username}{" "}
                  {selectedConversation.isOnline ? "(Online)" : ""}
                </Typography>
              </Box>
            )}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                display: "flex",
                flexDirection: "column",
                p: { xs: 1.5, sm: 2, md: 2.5 },
              }}
            >
              <MessageContainer userId={selectedConversation.userId} />
            </Box>
            <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, flexShrink: 0 }}>
              <MessageInput />
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "#1a1a1a",
              height: `calc(100vh - ${navHeight}px)`,
            }}
          >
            <Typography
              color="#8515fe"
              sx={{ fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" } }}
            >
              Select a chat to start messaging
            </Typography>
          </Box>
        )}
      </Box>
    </motion.div>
  );
};

export default ChatPage;
