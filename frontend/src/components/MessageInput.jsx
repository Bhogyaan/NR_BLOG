import { useRef, useState, useEffect } from "react";
import { Box, IconButton, InputAdornment, TextField, CircularProgress, Typography, Paper, Fade } from "@mui/material";
import { IoSendSharp } from "react-icons/io5";
import { BsFillImageFill } from "react-icons/bs";
import { Description as DescriptionIcon, Close as CloseIcon } from "@mui/icons-material";
import useShowToast from "../hooks/useShowToast";
import { conversationsAtom, selectedConversationAtom } from "../atoms/messagesAtom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import usePreviewImg from "../hooks/usePreviewImg";
import { motion } from "framer-motion";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "@mui/material/styles";

const MessageInput = () => {
  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const showToast = useShowToast();
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const setConversations = useSetRecoilState(conversationsAtom);
  const setSelectedConversation = useSetRecoilState(selectedConversationAtom);
  const imageRef = useRef(null);
  const docRef = useRef(null);
  const { handleImageChange, mediaUrl, setMediaUrl, mediaType, setMediaType } = usePreviewImg();
  const [isSending, setIsSending] = useState(false);
  const { socket } = useSocket();
  const typingTimeoutRef = useRef(null);
  const theme = useTheme();

  useEffect(() => {
    if (!socket || !selectedConversation._id || selectedConversation.mock) return;

    const emitTyping = () => {
      if (!isTyping) {
        socket.emit("typing", {
          conversationId: selectedConversation._id,
          userId: selectedConversation.userId,
        });
        setIsTyping(true);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", {
          conversationId: selectedConversation._id,
          userId: selectedConversation.userId,
        });
        setIsTyping(false);
      }, 2000);
    };

    if (messageText.trim() || mediaUrl) {
      emitTyping();
    } else if (isTyping) {
      socket.emit("stopTyping", {
        conversationId: selectedConversation._id,
        userId: selectedConversation.userId,
      });
      setIsTyping(false);
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTyping) {
        socket.emit("stopTyping", {
          conversationId: selectedConversation._id,
          userId: selectedConversation.userId,
        });
      }
    };
  }, [
    messageText,
    mediaUrl,
    selectedConversation._id,
    selectedConversation.mock,
    selectedConversation.userId,
    socket,
    isTyping,
  ]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && !mediaUrl) return;
    if (isSending) return;
    if (!selectedConversation.userId) {
      showToast("Error", "No recipient selected", "error");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText.trim(),
          recipientId: selectedConversation.userId,
          img: mediaUrl,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to send message: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }

      if (selectedConversation.mock) {
        setConversations((prevConvs) =>
          prevConvs.map((conv) =>
            conv._id === selectedConversation._id
              ? {
                  ...conv,
                  _id: data.conversationId,
                  mock: false,
                  lastMessage: {
                    text: messageText.trim() || "Media",
                    sender: { _id: data.sender._id },
                    seen: false,
                    status: "sent",
                  },
                  unreadCount: 0,
                }
              : conv
          )
        );
        setSelectedConversation((prev) => ({
          ...prev,
          _id: data.conversationId,
          mock: false,
        }));
      } else {
        setConversations((prevConvs) =>
          prevConvs.map((conv) =>
            conv._id === selectedConversation._id
              ? {
                  ...conv,
                  lastMessage: {
                    text: messageText.trim() || "Media",
                    sender: { _id: data.sender._id },
                    seen: false,
                    status: "sent",
                  },
                  unreadCount: 0,
                }
              : conv
          )
        );
      }

      setMessageText("");
      setMediaUrl(null);
      setMediaType(null);
    } catch (error) {
      showToast("Error", error.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelMedia = () => {
    setMediaUrl(null);
    setMediaType(null);
    imageRef.current.value = null;
    docRef.current.value = null;
  };

  const renderMediaPreview = () => {
    if (!mediaUrl) return null;
    switch (mediaType) {
      case "image":
        return (
          <Box
            component="img"
            src={mediaUrl}
            alt="Preview"
            sx={{
              maxWidth: "100%",
              maxHeight: { xs: "80px", sm: "120px" },
              borderRadius: 20,
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
            }}
          />
        );
      case "video":
        return (
          <Box
            component="video"
            src={mediaUrl}
            controls
            sx={{
              maxWidth: "100%",
              maxHeight: { xs: "80px", sm: "120px" },
              borderRadius: 20,
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
            }}
          />
        );
      case "audio":
        return (
          <Box
            component="audio"
            src={mediaUrl}
            controls
            sx={{
              width: "100%",
              "& audio": { width: "100%", borderRadius: 20, bgcolor: "#2e2e2e" },
            }}
          />
        );
      case "document":
        return (
          <Typography variant="body2" color="#8515fe">
            Document: {imageRef.current?.files[0]?.name || docRef.current?.files[0]?.name}
          </Typography>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        position: "sticky",
        bottom: 0,
        zIndex: 10,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pb: { xs: 1, sm: 2 },
        pt: 1,
        bgcolor: "transparent",
      }}
    >
      <Paper
        elevation={4}
        component={motion.form}
        onSubmit={handleSendMessage}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
        sx={{
          display: "flex",
          alignItems: "center",
          width: { xs: "98%", sm: "80%", md: "60%" },
          px: 2,
          py: 1.2,
          borderRadius: 999,
          boxShadow: theme.shadows[5],
          bgcolor: theme.palette.mode === "dark"
            ? "rgba(30,30,40,0.85)"
            : "rgba(255,255,255,0.85)",
          border: `1.5px solid ${theme.palette.primary.main}22`,
          backdropFilter: "blur(8px)",
          position: "relative",
        }}
      >
        {/* Media Preview */}
        {mediaUrl && (
          <Fade in={!!mediaUrl}>
            <Box
              sx={{
                mr: 2,
                display: "flex",
                alignItems: "center",
                position: "relative",
                minWidth: 60,
                minHeight: 40,
              }}
            >
              {mediaType === "image" && (
                <Box
                  component="img"
                  src={mediaUrl}
                  alt="Preview"
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    objectFit: "cover",
                    boxShadow: theme.shadows[2],
                  }}
                />
              )}
              {mediaType === "video" && (
                <Box
                  component="video"
                  src={mediaUrl}
                  controls
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    objectFit: "cover",
                    boxShadow: theme.shadows[2],
                  }}
                />
              )}
              {mediaType === "audio" && (
                <Box
                  component="audio"
                  src={mediaUrl}
                  controls
                  sx={{ width: 48, height: 32, borderRadius: 2, bgcolor: theme.palette.background.paper }}
                />
              )}
              <IconButton
                size="small"
                onClick={handleCancelMedia}
                sx={{
                  position: "absolute",
                  top: -10,
                  right: -10,
                  bgcolor: theme.palette.error.main,
                  color: "#fff",
                  boxShadow: theme.shadows[1],
                  '&:hover': { bgcolor: theme.palette.error.dark },
                }}
                aria-label="Remove media"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Fade>
        )}
        {/* Upload Buttons */}
        <IconButton
          onClick={() => imageRef.current.click()}
          sx={{
            color: theme.palette.primary.main,
            bgcolor: theme.palette.action.hover,
            mr: 1,
            transition: "background 0.2s, color 0.2s",
            '&:hover': { bgcolor: theme.palette.primary.light, color: '#fff' },
          }}
          aria-label="Upload media"
        >
          <BsFillImageFill size={22} />
        </IconButton>
        <IconButton
          onClick={() => docRef.current.click()}
          sx={{
            color: theme.palette.primary.main,
            bgcolor: theme.palette.action.hover,
            mr: 1,
            transition: "background 0.2s, color 0.2s",
            '&:hover': { bgcolor: theme.palette.primary.light, color: '#fff' },
          }}
          aria-label="Upload document"
        >
          <DescriptionIcon fontSize="small" />
        </IconButton>
        {/* Message Input */}
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          disabled={isSending}
          sx={{
            bgcolor: "transparent",
            borderRadius: 20,
            mx: 1,
            '& .MuiInputBase-root': {
              bgcolor: "transparent",
              color: theme.palette.text.primary,
              fontSize: { xs: "1rem", sm: "1.1rem" },
              fontWeight: 400,
              px: 1,
            },
            '& fieldset': { border: "none" },
            '& input': { color: theme.palette.text.primary },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  whileHover={{ scale: 1.1 }}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={isSending || (!messageText.trim() && !mediaUrl)}
                    sx={{
                      color: "#fff",
                      bgcolor: theme.palette.primary.main,
                      boxShadow: theme.shadows[2],
                      ml: 1,
                      transition: "background 0.2s, color 0.2s, box-shadow 0.2s",
                      '&:hover': { bgcolor: theme.palette.primary.dark, color: '#fff', boxShadow: theme.shadows[4] },
                      p: 1.2,
                    }}
                    aria-label="Send message"
                  >
                    {isSending ? (
                      <CircularProgress size={20} sx={{ color: "#fff" }} />
                    ) : (
                      <IoSendSharp size={22} />
                    )}
                  </IconButton>
                </motion.div>
              </InputAdornment>
            ),
          }}
        />
        <input
          type="file"
          hidden
          ref={imageRef}
          accept="image/*,video/*,audio/*"
          onChange={handleImageChange}
        />
        <input
          type="file"
          hidden
          ref={docRef}
          accept="application/pdf,text/plain"
          onChange={handleImageChange}
        />
      </Paper>
    </Box>
  );
};

export default MessageInput;