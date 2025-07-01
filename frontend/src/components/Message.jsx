import React, { useState } from "react";
import { Avatar, Box, Typography, Paper, Skeleton, IconButton, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { selectedConversationAtom } from "../atoms/messagesAtom";
import { BsCheck, BsCheck2All, BsHeart, BsHeartFill } from "react-icons/bs";
import { motion } from "framer-motion";
import { format } from "date-fns";

const isOnlyEmoji = (text) => {
  // Regex for emoji-only messages (simple version)
  return /^\p{Emoji}+$|^\p{Emoji}(\s\p{Emoji})*$/u.test(text.trim());
};

const Message = ({ isOwnMessage, message }) => {
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const user = useRecoilValue(userAtom);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [loved, setLoved] = useState(false);
  const theme = useTheme();

  // Determine text color based on theme mode
  const isDark = theme.palette.mode === 'dark';
  const senderTextColor = isDark ? '#fff' : '#8515fe';
  const receiverTextColor = isDark ? '#fff' : '#000';

  const renderMedia = () => {
    if (!message.img) return null;
    const fileType = message.img.split(";")[0].split(":")[1] || "";
    if (fileType.includes("image")) {
      return (
        <Box
          component="img"
          src={message.img}
          loading="lazy"
          alt="Message content"
          sx={{
            maxWidth: "100%",
            maxHeight: { xs: "180px", sm: "220px" },
            borderRadius: 4,
            display: mediaLoaded ? "block" : "none",
            boxShadow: theme.shadows[4],
          }}
          onLoad={() => setMediaLoaded(true)}
          onError={() => setMediaLoaded(true)}
        />
      );
    } else if (fileType.includes("video")) {
      return (
        <Box
          component="video"
          src={message.img}
          controls
          sx={{
            maxWidth: "100%",
            maxHeight: { xs: "180px", sm: "220px" },
            borderRadius: 4,
            boxShadow: theme.shadows[4],
          }}
        />
      );
    } else if (fileType.includes("audio")) {
      return (
        <Box
          component="audio"
          src={message.img}
          controls
          sx={{
            width: "100%",
            "& audio": { width: "100%", height: "40px", borderRadius: 20, bgcolor: theme.palette.background.paper },
          }}
        />
      );
    } else if (fileType.includes("pdf") || fileType.includes("text")) {
      return (
        <Typography
          variant="body2"
          color={theme.palette.primary.main}
          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
        >
          Document: <a href={message.img} download style={{ color: theme.palette.primary.main }}>Download</a>
        </Typography>
      );
    }
    return (
      <Typography
        variant="body2"
        color={theme.palette.primary.main}
        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
      >
        Unsupported media: <a href={message.img} download style={{ color: theme.palette.primary.main }}>Download</a>
      </Typography>
    );
  };

  const renderStatus = () => {
    if (!isOwnMessage) return null;
    if (message.seen || message.status === "seen") {
      return (
        <Tooltip title="Seen" arrow>
          <Box sx={{ position: "relative", ml: 0.5, display: "flex", alignItems: "center" }}>
            <BsCheck2All size={18} color={theme.palette.success.main} />
          </Box>
        </Tooltip>
      );
    } else if (message.status === "delivered") {
      return (
        <Tooltip title="Delivered" arrow>
          <Box sx={{ position: "relative", ml: 0.5, display: "flex", alignItems: "center" }}>
            <BsCheck2All size={18} color={theme.palette.grey[400]} />
          </Box>
        </Tooltip>
      );
    }
    return (
      <Tooltip title="Sent" arrow>
        <Box sx={{ position: "relative", ml: 0.5, display: "flex", alignItems: "center" }}>
          <BsCheck size={18} color={theme.palette.grey[400]} />
        </Box>
      </Tooltip>
    );
  };

  // Bubble border radius for modern look
  const bubbleRadius = isOwnMessage
    ? { borderRadius: "18px 18px 4px 18px" }
    : { borderRadius: "18px 18px 18px 4px" };

  // Use a darker gradient for own messages
  const ownGradient = `linear-gradient(135deg, #4B006E 60%, #2D0B4E 100%)`;

  // Emoji-only message style
  const isEmojiOnly = message.text && isOnlyEmoji(message.text);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isOwnMessage ? "row-reverse" : "row",
        alignItems: "flex-end",
        p: 1,
        gap: 1,
        position: "relative",
      }}
      component={motion.div}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, type: "spring", bounce: 0.3 }}
    >
      {!isOwnMessage && (
        <Avatar
          src={selectedConversation.userProfilePic}
          sx={{ width: 36, height: 36, mr: -1.5, zIndex: 2, boxShadow: theme.shadows[2], border: `2px solid ${theme.palette.background.default}` }}
        />
      )}
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.2,
          bgcolor: isOwnMessage ? ownGradient : theme.palette.background.paper,
          color: isOwnMessage ? senderTextColor : receiverTextColor,
          ...bubbleRadius,
          maxWidth: { xs: "80%", sm: "70%" },
          minWidth: 40,
          boxShadow: theme.shadows[4],
          position: "relative",
          overflow: "visible",
          border: isOwnMessage ? `1.5px solid ${theme.palette.primary.main}` : `1.5px solid ${theme.palette.divider}`,
          transition: "background 0.3s, box-shadow 0.3s",
        }}
      >
        {/* Heart/Love Reaction */}
        <Box
          sx={{
            position: "absolute",
            top: -18,
            right: isOwnMessage ? -18 : "auto",
            left: isOwnMessage ? "auto" : -18,
            zIndex: 3,
            opacity: 0.85,
            display: "none",
            '@media (hover: hover)': {
              display: 'block',
            },
            '&:hover': {
              opacity: 1,
            },
          }}
        >
          <IconButton
            size="small"
            onClick={() => setLoved((v) => !v)}
            sx={{
              color: loved ? theme.palette.error.main : theme.palette.grey[400],
              background: theme.palette.background.paper,
              boxShadow: theme.shadows[1],
              '&:hover': { color: theme.palette.error.main, background: theme.palette.background.paper },
              p: 0.5,
            }}
            aria-label="Love message"
          >
            {loved ? <BsHeartFill size={18} /> : <BsHeart size={18} />}
          </IconButton>
        </Box>
        {/* Message Content */}
        {message.text && (
          <Typography
            variant={isEmojiOnly ? "h3" : "body2"}
            sx={{
              wordBreak: "break-word",
              fontSize: isEmojiOnly ? { xs: "2.5rem", sm: "3rem" } : { xs: "0.98rem", sm: "1.05rem" },
              textAlign: isEmojiOnly ? "center" : "left",
              lineHeight: isEmojiOnly ? 1.2 : 1.5,
              mb: message.img ? 1 : 0,
              letterSpacing: isEmojiOnly ? 2 : 0,
              transition: "font-size 0.2s",
              color: isOwnMessage ? senderTextColor : receiverTextColor,
              textShadow: 'none',
            }}
          >
            {message.text}
          </Typography>
        )}
        {message.img && (
          <Box sx={{ mt: message.text ? 1 : 0 }}>
            {renderMedia()}
            {!mediaLoaded && message.img.includes("image") && (
              <Skeleton
                variant="rectangular"
                width="100%"
                height={120}
                sx={{ borderRadius: 4, bgcolor: theme.palette.grey[800] }}
              />
            )}
          </Box>
        )}
        {/* Timestamp and Status */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            mt: 1,
            gap: 0.5,
            width: "100%",
          }}
        >
          <Typography
            variant="caption"
            color={isOwnMessage ? senderTextColor : receiverTextColor}
            sx={{ fontSize: { xs: "0.72rem", sm: "0.8rem" }, opacity: 0.7, textShadow: 'none' }}
          >
            {format(new Date(message.createdAt), "h:mm a")}
          </Typography>
          {renderStatus()}
        </Box>
      </Paper>
    </Box>
  );
};

export default Message;