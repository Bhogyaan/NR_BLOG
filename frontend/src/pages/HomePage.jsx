import { useState, useEffect, useCallback, useRef } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "@mui/material/styles";
import {
  Avatar,
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  CircularProgress,
  Skeleton,
  useMediaQuery,
  Modal,
  Drawer,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
} from "@mui/material";
import {
  Add as AddIcon,
  AttachFile as AttachFileIcon,
  Send as SendIcon,
  LocationOn as LocationIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { Upload, message } from "antd";
import { Document, Page, pdfjs } from "react-pdf";
import { BsFileEarmarkTextFill, BsFileZipFill, BsFiletypePdf } from "react-icons/bs";
import postsAtom from "../atoms/postsAtom";
import userAtom from "../atoms/userAtom";
import { conversationsAtom, selectedConversationAtom } from "../atoms/messagesAtom";
import Post from "../components/Post";
import SuggestedUsers from "../components/SuggestedUsers";
import Story from "../components/Story";
import BottomNav from "../components/BottomNav";
import MessageContainer from "../components/MessageContainer";
import useShowToast from "../hooks/useShowToast";
import { useSocket } from "../context/SocketContext";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const { Dragger } = Upload;

const MAX_CHAR = 500;
const MAX_FILE_SIZE = {
  document: 2 * 1024 * 1024 * 1024, // 2GB
  image: 16 * 1024 * 1024, // 16MB
  video: 16 * 1024 * 1024, // 16MB
  audio: 16 * 1024 * 1024, // 16MB
};

const SUPPORTED_FORMATS = {
  image: ["image/jpeg", "image/png", "image/gif", "image/heic"],
  video: ["video/mp4", "video/x-matroska", "video/avi", "video/3gpp", "video/quicktime"],
  audio: ["audio/mpeg", "audio/aac", "audio/x-m4a", "audio/opus", "audio/wav"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "application/rtf",
    "application/zip",
    "application/x-zip-compressed",
  ],
};

const HomePage = () => {
  const [postsState, setPostsState] = useRecoilState(postsAtom);
  const user = useRecoilValue(userAtom);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const isSmallScreen = useMediaQuery("(max-width:500px)");
  const isMediumScreen = useMediaQuery("(min-width:501px) and (max-width:900px)");
  const isLargeScreen = useMediaQuery("(min-width:901px)");
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState("");
  const [numPages, setNumPages] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [remainingChar, setRemainingChar] = useState(MAX_CHAR);
  const navigate = useNavigate();
  const showToast = useShowToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const { socket, onlineUsers } = useSocket();
  const theme = useTheme();
  const imageRef = useRef(null);

  const fetchPosts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setFetchError(null);
      const endpoint = user?.isAdmin ? "/api/posts/all" : "/api/posts/feed";
      const token = localStorage.getItem("token");
      const res = await fetch(endpoint, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) {
        setFetchError(data.error);
        showToast("Error", data.error, "error");
        return;
      }
      if (!Array.isArray(data)) {
        setFetchError("Invalid data format");
        return;
      }
      setPostsState((prev) => ({ ...prev, posts: data }));
    } catch (error) {
      setFetchError(error.message);
      showToast("Error", error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [user, showToast, setPostsState]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleBanUnbanPost = async (postId, isBanned) => {
    if (!user?.isAdmin) {
      showToast("Error", "Admin access required", "error");
      return;
    }
    try {
      const endpoint = isBanned ? `/api/posts/unban/${postId}` : `/api/posts/ban/${postId}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      showToast("Success", isBanned ? "Post unbanned" : "Post banned", "success");
      setPostsState((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => (p._id === postId ? { ...p, isBanned: !isBanned } : p)),
      }));
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  useEffect(() => {
    if (!socket) {
      console.warn("Socket is not initialized in HomePage");
      return;
    }

    socket.on("newPost", (post) => {
      if (user?.isAdmin || user?.following?.includes(post.postedBy._id)) {
        setPostsState((prev) => ({
          ...prev,
          posts: [post, ...(prev.posts || [])],
        }));
      }
    });

    socket.on("postDeleted", ({ postId }) => {
      setPostsState((prev) => ({
        ...prev,
        posts: (prev.posts || []).filter((p) => p._id !== postId),
      }));
    });

    socket.on("messagesSeen", ({ conversationId }) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId ? { ...conv, lastMessage: { ...conv.lastMessage, seen: true } } : conv
        )
      );
    });

    socket.on("newMessage", (message) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === message.conversationId
            ? { ...conv, lastMessage: { text: message.text, sender: message.sender } }
            : conv
        )
      );
    });

    return () => {
      socket.off("newPost");
      socket.off("postDeleted");
      socket.off("messagesSeen");
      socket.off("newMessage");
    };
  }, [socket, setPostsState, setConversations, user]);

  useEffect(() => {
    const getConversations = async () => {
      setLoadingConversations(true);
      try {
        const res = await fetch("/api/messages/conversations", {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) {
          showToast("Error", data.error, "error");
          return;
        }
        setConversations(data);
      } catch (error) {
        showToast("Error", error.message, "error");
      } finally {
        setLoadingConversations(false);
      }
    };
    getConversations();
  }, [setConversations, showToast]);

  const getSupportedFormatsMessage = () => {
    const formatLists = Object.entries(SUPPORTED_FORMATS).map(([type, formats]) => {
      const extensions = formats.map((fmt) => fmt.split("/")[1].toUpperCase()).join(", ");
      return `${type.charAt(0).toUpperCase() + type.slice(1)}: ${extensions}`;
    });
    return formatLists.join("; ");
  };

  const validateFile = (file) => {
    if (!file) return true;

    const fileType = file.type;
    const detectedMediaType = Object.keys(SUPPORTED_FORMATS).find((key) =>
      SUPPORTED_FORMATS[key].includes(fileType)
    );

    if (!detectedMediaType) {
      showToast("Error", `Unsupported file format. Supported formats: ${getSupportedFormatsMessage()}`, "error");
      return false;
    }

    if (file.size > MAX_FILE_SIZE[detectedMediaType]) {
      const maxSizeMB = MAX_FILE_SIZE[detectedMediaType] / (1024 * 1024);
      const message =
        detectedMediaType === "document"
          ? `Please upload within 2GB document.`
          : `Please upload within ${maxSizeMB}MB ${detectedMediaType} files.`;
      showToast("Error", `${message} Supported formats: ${getSupportedFormatsMessage()}`, "error");
      return false;
    }

    setMediaType(detectedMediaType);
    return true;
  };

  const handleMediaChange = (info) => {
    const { file } = info;
    if (file.status === "removed") {
      setMedia(null);
      setMediaType("");
      setNumPages(null);
      return;
    }

    if (!validateFile(file)) {
      setMedia(null);
      setMediaType("");
      setNumPages(null);
      return;
    }

    setMedia(file);
    setNumPages(null);
  };

  const handleTextChange = (e) => {
    const inputText = e.target.value;
    if (inputText.length > MAX_CHAR) {
      setText(inputText.slice(0, MAX_CHAR));
      setRemainingChar(0);
    } else {
      setText(inputText);
      setRemainingChar(MAX_CHAR - inputText.length);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleCreatePost = async () => {
    if (!user) {
      showToast("Error", "You must be logged in to create a post", "error");
      return;
    }
    if (!text.trim() && !media) {
      showToast("Error", "Text or media is required", "error");
      return;
    }

    setIsPosting(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("postedBy", user._id);
    formData.append("text", text);
    if (media) {
      formData.append("media", media);
      formData.append("mediaType", mediaType);
    }

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/posts/create", true);
      xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("token")}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          setPostsState((prev) => ({
            ...prev,
            posts: [data, ...(prev.posts || [])],
          }));
          setText("");
          setMedia(null);
          setMediaType("");
          setNumPages(null);
          showToast("Success", "Post created successfully", "success");
          setModalOpen(false);
          if (socket) {
            socket.emit("newPost", data);
          }
        } else {
          showToast("Error", JSON.parse(xhr.responseText).error || "Server error occurred", "error");
        }
        setIsPosting(false);
      };

      xhr.onerror = () => {
        showToast("Error", "An unexpected error occurred", "error");
        setIsPosting(false);
        setUploadProgress(0);
      };

      xhr.send(formData);
    } catch (error) {
      showToast("Error", `Failed to create post: ${error.message}`, "error");
      setIsPosting(false);
      setUploadProgress(0);
    }
  };

  const renderDocumentIcon = (fileType) => {
    if (fileType === "application/pdf") {
      return <BsFiletypePdf size={24} />;
    } else if (fileType === "application/zip" || fileType === "application/x-zip-compressed") {
      return <BsFileZipFill size={24} />;
    } else {
      return <BsFileEarmarkTextFill size={24} />;
    }
  };

  const ChatFeature = () => {
    const [followingDetails, setFollowingDetails] = useState({});
    const [error, setError] = useState(null);

    useEffect(() => {
      const fetchFollowingDetails = async () => {
        if (!user?.following?.length) {
          setFollowingDetails({});
          setError(null);
          return;
        }
        try {
          const res = await fetch("/api/users/multiple", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            credentials: "include",
            body: JSON.stringify({ ids: user.following }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          const detailsMap = data.reduce((acc, following) => ({
            ...acc,
            [following._id]: { _id: following._id, username: following.username, profilePic: following.profilePic },
          }), {});
          setFollowingDetails(detailsMap);
          setError(null);
        } catch (error) {
          console.error("Error fetching following details:", error);
          setError("Failed to load following details.");
          setFollowingDetails({});
        }
      };
      fetchFollowingDetails();
    }, [user?.following]);

    useEffect(() => {
      if (!socket || !user?._id) return;

      const handleUserFollowed = ({ followedId, follower }) => {
        if (follower._id === user._id) {
          fetchFollowingDetails();
        }
      };

      const handleUserUnfollowed = ({ unfollowedId, followerId }) => {
        if (followerId === user._id) {
          setFollowingDetails((prev) => {
            const newDetails = { ...prev };
            delete newDetails[unfollowedId];
            return newDetails;
          });
        }
      };

      socket.on("userFollowed", handleUserFollowed);
      socket.on("userUnfollowed", handleUserUnfollowed);

      return () => {
        socket.off("userFollowed", handleUserFollowed);
        socket.off("userUnfollowed", handleUserUnfollowed);
      };
    }, [socket, user?._id]);

    const allFollowing = Object.values(followingDetails);

    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: 1,
            bgcolor: "primary.main",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Following (Online)
          </Typography>
        </Box>
        <Box sx={{ flex: 1, overflowY: "auto", p: 1, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
          {error ? (
            <Typography variant="body2" color="error" sx={{ p: 2, textAlign: "center" }}>
              {error}
            </Typography>
          ) : allFollowing.length > 0 ? (
            allFollowing.map((following) => {
              const isOnline = onlineUsers.includes(following._id);
              const badgeColor = isOnline ? "#90EE90" : "#808080";

              return (
                <motion.div
                  key={following._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ListItem
                    sx={{
                      "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" },
                      py: 1,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      const newConversation = {
                        _id: `temp_${following._id}`,
                        participants: [user._id, following._id],
                        lastMessage: { text: "", sender: "" },
                      };
                      setConversations((prev) => [newConversation, ...prev]);
                      setSelectedConversation(newConversation);
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        variant="dot"
                        sx={{
                          "& .MuiBadge-badge": {
                            backgroundColor: badgeColor,
                            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                          },
                        }}
                      >
                        <Avatar src={following.profilePic} sx={{ width: 32, height: 32 }} />
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="text.primary">
                          {following.username}
                        </Typography>
                      }
                    />
                  </ListItem>
                </motion.div>
              );
            })
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              No following users available
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  const renderPostsWithSuggestedUsers = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {[1, 2, 3].map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Box sx={{ p: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ ml: 1 }}>
                    <Skeleton variant="text" width={100} />
                    <Skeleton variant="text" width="0.8em" />
                  </Box>
                </Box>
                <Skeleton variant="rectangular" height={200} />
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="0.9em" />
              </Box>
            </motion.div>
          ))}
        </Box>
      );
    }

    if (fetchError) {
      return (
        <Box sx={{ textAlign: "center", my: "2em" }}>
          <Typography color="error">Failed to load posts: {fetchError}</Typography>
          <Button onClick={fetchPosts} color="primary" sx={{ marginTop: "1rem" }} variant="outlined">
            Retry
          </Button>
        </Box>
      );
    }

    if (!postsState.posts?.length) {
      return (
        <Typography variant="h6" align="center" sx={{ marginTop: "2rem" }}>
          No posts available
        </Typography>
      );
    }

    const content = [];
    postsState.posts.forEach((post, index) => {
      content.push(
        <motion.div
          key={post._id}
          initial={{ y: "1.5rem", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Post
            post={post}
            postedBy={post.postedBy}
            isAdminView={user?.isAdmin}
            onBanUnbanPost={handleBanUnbanPost}
          />
        </motion.div>
      );

      if (index === 1) {
        content.push(
          <motion.div
            key="suggested-users"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{ marginTop: index === 0 ? "16px" : "0" }}
          >
            <Box sx={{ padding: "2rem 0" }}>
              <SuggestedUsers />
            </Box>
          </motion.div>
        );
      }
    });

    return <Box sx={{ display: "flex", flexDirection: "column", paddingTop: "1rem" }}>{content}</Box>;
  };

  const renderCreatePostModal = () => (
    <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: isMediumScreen ? 400 : 500,
          bgcolor: "background.paper",
          p: 2,
          borderRadius: 2,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <LocationIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Create Post</Typography>
          <IconButton sx={{ ml: "auto" }} onClick={() => setModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="Type your post..."
          value={text}
          onChange={handleTextChange}
          sx={{ my: 1 }}
        />
        <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 2 }}>
          {remainingChar} characters remaining
        </Typography>
        <Box textAlign="center" mb={2}>
          <Button
            variant="outlined"
            startIcon={<AttachFileIcon />}
            onClick={() => imageRef.current.click()}
          >
            Upload Media
          </Button>
          <input
            type="file"
            hidden
            ref={imageRef}
            onChange={(e) => handleMediaChange({ file: e.target.files[0] })}
            accept={Object.values(SUPPORTED_FORMATS).flat().join(",")}
          />
        </Box>
        <Typography variant="caption" color="textSecondary" sx={{ display: "block", textAlign: "center", mb: 2 }}>
          Supported formats: Images (JPEG, PNG, GIF, HEIC); Videos (MP4, MKV, AVI, 3GP, MOV); Audio (MP3, AAC, M4A, OPUS, WAV); Documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, RTF, ZIP). Max sizes: Images/Videos/Audio 16MB, Documents 2GB.
        </Typography>
        {media && (
          <Box mb={3} position="relative">
            <Typography variant="subtitle2" gutterBottom>
              Selected: {media.name} ({(media.size / 1024 / 1024).toFixed(2)}MB)
            </Typography>
            <Box border={1} borderColor="divider" borderRadius={2} p={2}>
              {mediaType === "image" && (
                <img
                  src={URL.createObjectURL(media)}
                  alt="Preview"
                  style={{ maxWidth: "100%", maxHeight: "400px", objectFit: "contain" }}
                />
              )}
              {mediaType === "video" && (
                <video
                  controls
                  src={URL.createObjectURL(media)}
                  style={{ maxWidth: "100%", maxHeight: "400px" }}
                />
              )}
              {mediaType === "audio" && (
                <audio controls src={URL.createObjectURL(media)} style={{ width: "100%" }} />
              )}
              {mediaType === "document" && (
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    {renderDocumentIcon(media.type)}
                    <Typography variant="body1">{media.name}</Typography>
                  </Box>
                  {media.type === "application/pdf" && (
                    <Box height="400px" overflow="auto">
                      <Document file={URL.createObjectURL(media)} onLoadSuccess={onDocumentLoadSuccess}>
                        {Array.from({ length: numPages || 1 }, (_, i) => (
                          <Page key={`page_${i + 1}`} pageNumber={i + 1} width={450} />
                        ))}
                      </Document>
                    </Box>
                  )}
                </Box>
              )}
              <IconButton
                onClick={() => {
                  setMedia(null);
                  setMediaType("");
                  setNumPages(null);
                }}
                sx={{ position: "absolute", top: 8, right: 8 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        )}
        {isPosting && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="caption" display="block" textAlign="right">
              {uploadProgress}%
            </Typography>
          </Box>
        )}
        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreatePost}
            disabled={isPosting}
            endIcon={<SendIcon />}
          >
            Post
          </Button>
        </Box>
      </Box>
    </Modal>
  );

  const renderCreatePostDrawer = () => (
    <Drawer
      anchor="bottom"
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, p: 1 } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <LocationIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6">Create Post</Typography>
        <IconButton sx={{ ml: "auto" }} onClick={() => setModalOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      <TextField
        fullWidth
        multiline
        rows={3}
        placeholder="Type your post..."
        value={text}
        onChange={handleTextChange}
        sx={{ my: 1 }}
      />
      <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 2 }}>
        {remainingChar} characters remaining
      </Typography>
      <Box textAlign="center" mb={2}>
        <Button
          variant="outlined"
          startIcon={<AttachFileIcon />}
          onClick={() => imageRef.current.click()}
        >
          Upload Media
        </Button>
        <input
          type="file"
          hidden
          ref={imageRef}
          onChange={(e) => handleMediaChange({ file: e.target.files[0] })}
          accept={Object.values(SUPPORTED_FORMATS).flat().join(",")}
        />
      </Box>
      <Typography variant="caption" color="textSecondary" sx={{ display: "block", textAlign: "center", mb: 2 }}>
        Supported formats: Images (JPEG, PNG, GIF, HEIC); Videos (MP4, MKV, AVI, 3GP, MOV); Audio (MP3, AAC, M4A, OPUS, WAV); Documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, RTF, ZIP). Max sizes: Images/Videos/Audio 16MB, Documents 2GB.
      </Typography>
      {media && (
        <Box mb={3} position="relative">
          <Typography variant="subtitle2" gutterBottom>
            Selected: {media.name.substring(0, 15)}... ({(media.size / 1024 / 1024).toFixed(2)}MB)
          </Typography>
          <Box border={1} borderColor="divider" borderRadius={2} p={2}>
            {mediaType === "image" && (
              <img
                src={URL.createObjectURL(media)}
                alt="Preview"
                style={{ maxWidth: "100%", maxHeight: "300px", objectFit: "contain" }}
              />
            )}
            {mediaType === "video" && (
              <video
                controls
                src={URL.createObjectURL(media)}
                style={{ maxWidth: "100%", maxHeight: "300px" }}
              />
            )}
            {mediaType === "audio" && (
              <audio controls src={URL.createObjectURL(media)} style={{ width: "100%" }} />
            )}
            {mediaType === "document" && (
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  {renderDocumentIcon(media.type)}
                  <Typography variant="body1">{media.name}</Typography>
                </Box>
                {media.type === "application/pdf" && (
                  <Box height="300px" overflow="auto">
                    <Document file={URL.createObjectURL(media)} onLoadSuccess={onDocumentLoadSuccess}>
                      {Array.from({ length: numPages || 1 }, (_, i) => (
                        <Page key={`page_${i + 1}`} pageNumber={i + 1} width={300} />
                      ))}
                    </Document>
                  </Box>
                )}
              </Box>
            )}
            <IconButton
              onClick={() => {
                setMedia(null);
                setMediaType("");
                setNumPages(null);
              }}
              sx={{ position: "absolute", top: 8, right: 8 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )}
      {isPosting && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="caption" display="block" textAlign="right">
            {uploadProgress}%
          </Typography>
        </Box>
      )}
      <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreatePost}
          disabled={isPosting}
          endIcon={<SendIcon />}
          size="small"
        >
          Post
        </Button>
      </Box>
    </Drawer>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Box sx={{ paddingBottom: isSmallScreen ? 8 : 0 }}>
        {isLargeScreen && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              height: "100vh",
              overflowY: "hidden",
            }}
          >
            <Box
              sx={{
                flex: "1 1 80%",
                overflowY: "auto",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
              }}
            >
              {!loading && postsState.stories?.length > 0 && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* <Box sx={{ display: "flex", gap: 1, overflowX: "auto", py: 1 }}>
                    {postsState.stories.map((story) => (
                      <Story key={story._id} story={story} />
                    ))}
                  </Box> */}
                </motion.div>
              )}
              {renderPostsWithSuggestedUsers()}
            </Box>
            <Box
              sx={{
                flex: "0 0 20%",
                minWidth: "200px",
                overflowY: "hidden",
              }}
            >
              {selectedConversation._id ? (
                <MessageContainer isMobile={false} />
              ) : (
                <ChatFeature />
              )}
            </Box>
          </Box>
        )}

        {isMediumScreen && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              height: "100vh",
              overflowY: "hidden",
            }}
          >
            <Box
              sx={{
                flex: "1 1 80%",
                overflowY: "auto",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
              }}
            >
              {!loading && postsState.stories?.length > 0 && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* <Box sx={{ display: "flex", gap: 1, overflowX: "auto", py: 1 }}>
                    {postsState.stories.map((story) => (
                      <Story key={story._id} story={story} />
                    ))}
                  </Box> */}
                </motion.div>
              )}
              {renderPostsWithSuggestedUsers()}
            </Box>
            <Box
              sx={{
                flex: "0 0 20%",
                minWidth: "150px",
                overflowY: "hidden",
              }}
            >
              {selectedConversation._id ? (
                <MessageContainer isMobile={false} />
              ) : (
                <ChatFeature />
              )}
            </Box>
          </Box>
        )}

        {isSmallScreen && (
          <Box
            sx={{
              width: "100%",
              height: "calc(100vh - 56px)",
              overflowY: "auto",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {!loading && postsState.stories?.length > 0 && (
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* <Box sx={{ display: "flex", gap: 1, overflowX: "auto", py: 1 }}>
                  {postsState.stories.map((story) => (
                    <Story key={story._id} story={story} />
                  ))}
                </Box> */}
              </motion.div>
            )}
            {selectedConversation._id ? (
              <MessageContainer isMobile={true} />
            ) : (
              renderPostsWithSuggestedUsers()
            )}
          </Box>
        )}

        {(isMediumScreen || isLargeScreen) && (
          <>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              style={{ position: "fixed", bottom: 16, right: 16 }}
            >
              <IconButton
                color="primary"
                aria-label="Create Post"
                onClick={() => setModalOpen(true)}
                sx={{
                  width: 56,
                  height: 56,
                  boxShadow: 3,
                  bgcolor: "primary.main",
                  color: "white",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                <AddIcon />
              </IconButton>
            </motion.div>
            {renderCreatePostModal()}
          </>
        )}

        {isSmallScreen && (
          <>
            {renderCreatePostDrawer()}
            <BottomNav user={user} />
          </>
        )}
      </Box>
    </motion.div>
  );
};

export default HomePage;