import React, { useRef, useState, useEffect } from "react";
import {
  Box,
  Button,
  IconButton,
  Modal,
  TextareaAutosize,
  Typography,
  Select,
  MenuItem,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { Close as CloseIcon, Upload as UploadIcon } from "@mui/icons-material";
import { motion } from "framer-motion";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import useShowToast from "../hooks/useShowToast";
import postsAtom from "../atoms/postsAtom";
import { useNavigate } from "react-router-dom";
import { BsFileEarmarkTextFill, BsFileZipFill, BsFiletypePdf } from "react-icons/bs";
import { Document, Page } from "react-pdf";
import { pdfjs } from "react-pdf";
import { useSocket } from "../context/SocketContext";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
  audio: ["audio/mpeg", "audio/aac", "audio/x-m4a", "audio/opus", "audio/wav", "audio/mp3", "audio/ogg"],
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

const CreatePost = ({ isOpen, onClose, onPostCreated }) => {
  const [postText, setPostText] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const imageRef = useRef(null);
  const [remainingChar, setRemainingChar] = useState(MAX_CHAR);
  const user = useRecoilValue(userAtom);
  const showToast = useShowToast();
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useRecoilState(postsAtom);
  const [postType, setPostType] = useState("post");
  const navigate = useNavigate();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [lastLoaded, setLastLoaded] = useState(0);
  const [lastTime, setLastTime] = useState(null);
  const { socket, connectionStatus } = useSocket();
  const [notification, setNotification] = useState({ open: false, message: "", severity: "error" });

  useEffect(() => {
    if (!user || !user._id) {
      showToast("Error", "User not authenticated. Please log in.", "error");
      onClose();
    }
  }, [isOpen, user, showToast, onClose]);

  useEffect(() => {
    if (socket && connectionStatus === "connected") {
      const handleNewPost = (newPost) => {
        if (!posts.posts.some((post) => post._id === newPost._id)) {
          setPosts((prev) => ({
            ...prev,
            posts: [newPost, ...prev.posts],
          }));
          showToast("New Post", "A new post has been created!", "info");
        }
      };

      socket.on("newPost", handleNewPost);
      socket.on("newFeedPost", handleNewPost);

      return () => {
        socket.off("newPost", handleNewPost);
        socket.off("newFeedPost", handleNewPost);
      };
    }
  }, [socket, connectionStatus, setPosts, showToast, posts.posts]);

  const handleTextChange = (e) => {
    const inputText = e.target.value;
    if (inputText.length > MAX_CHAR) {
      setPostText(inputText.slice(0, MAX_CHAR));
      setRemainingChar(0);
    } else {
      setPostText(inputText);
      setRemainingChar(MAX_CHAR - inputText.length);
    }
  };

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
      setNotification({
        open: true,
        message: `Unsupported file format. Supported formats: ${getSupportedFormatsMessage()}`,
        severity: "error",
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE[detectedMediaType]) {
      const maxSizeMB = MAX_FILE_SIZE[detectedMediaType] / (1024 * 1024);
      const message =
        detectedMediaType === "document"
          ? `Please upload within 2GB document.`
          : `Please upload within ${maxSizeMB}MB ${detectedMediaType} files.`;
      setNotification({
        open: true,
        message: `${message} Supported formats: ${getSupportedFormatsMessage()}`,
        severity: "error",
      });
      return false;
    }

    setMediaType(detectedMediaType);
    return true;
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!validateFile(file)) {
      setMediaFile(null);
      setMediaType(null);
      return;
    }

    setMediaFile(file);
    setNumPages(null);
  };

  const handleCreatePost = async () => {
    if (!postText.trim() && !mediaFile) {
      setNotification({
        open: true,
        message: "Please provide text or media for your post.",
        severity: "error",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setUploadSpeed(0);
    setLastLoaded(0);
    setLastTime(Date.now());

    const formData = new FormData();
    formData.append("postedBy", user._id);
    formData.append("text", postText);
    if (mediaFile) {
      formData.append("media", mediaFile);
      formData.append("mediaType", mediaType);
    }

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", postType === "post" ? "/api/posts/create" : "/api/posts/story", true);
      xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("token")}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);

          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          if (timeDiff > 0) {
            const loadedDiff = event.loaded - lastLoaded;
            const speed = Math.round((loadedDiff / timeDiff) / 1024);
            setUploadSpeed(speed);
          }
          setLastLoaded(event.loaded);
          setLastTime(now);
        }
      };

      xhr.onload = () => {
        setLoading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          setNotification({
            open: true,
            message: `${postType} created successfully!`,
            severity: "success",
          });
          setPostText("");
          setMediaFile(null);
          setMediaType(null);
          onClose();
          navigate("/");
          setPosts((prev) => ({
            ...prev,
            posts: [data, ...prev.posts.filter((post) => post._id !== data._id)],
          }));
          if (socket && connectionStatus === "connected") {
            socket.emit("newPost", data);
          }
        } else {
          const error = JSON.parse(xhr.responseText).error || "Failed to create post.";
          setNotification({
            open: true,
            message: error,
            severity: "error",
          });
        }
      };

      xhr.onerror = () => {
        setNotification({
          open: true,
          message: "Upload failed. Please check your connection and try again.",
          severity: "error",
        });
        setLoading(false);
      };

      xhr.send(formData);
    } catch (error) {
      setNotification({
        open: true,
        message: `Failed to create post: ${error.message}`,
        severity: "error",
      });
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
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

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", md: "600px" },
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 3,
          borderRadius: 2,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            severity={notification.severity}
            action={
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={handleCloseNotification}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
            icon={
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <img
                  src="/logo.png" // Replace with your logo path
                  alt="Logo"
                  style={{ width: 24, height: 24 }}
                />
              </motion.div>
            }
            sx={{ width: "100%", fontSize: "1rem" }}
          >
            {notification.message}
          </Alert>
        </Snackbar>

    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
    <Typography variant="h6">Create Post</Typography>
    <IconButton onClick={onClose}>
      <CloseIcon />
    </IconButton>
  </Box>

  <TextareaAutosize
    placeholder="Write your post..."
    onChange={handleTextChange}
    value={postText}
    minRows={4}
    style={{
      width: "100%",
      padding: "12px",
      border: "1px solid #ddd",
      borderRadius: "8px",
      marginBottom: "12px",
      fontSize: "16px",
    }}
  />
  <Typography variant="caption" color="textSecondary" mb={2}>
    {remainingChar} characters remaining
  </Typography>

  <input
    type="file"
    hidden
    ref={imageRef}
    onChange={handleFileChange}
    accept={Object.values(SUPPORTED_FORMATS).flat().join(",")}
  />

  <Box textAlign="center" mb={2}>
    <Button
      variant="outlined"
      startIcon={<UploadIcon />}
      onClick={() => imageRef.current.click()}
    >
      Upload Media
    </Button>
  </Box>

  <Typography
    variant="caption"
    color="textSecondary"
    mb={2}
    sx={{ display: "block", textAlign: "center" }}
  >
    Supported formats: Images (JPEG, PNG, GIF, HEIC); Videos (MP4, MKV, AVI, 3GP, MOV);
    Audio (MP3, AAC, M4A, OPUS, WAV, OGG); Documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, RTF, ZIP). 
    Max sizes: Images/Videos/Audio 16MB, Documents 2GB.
  </Typography>

  {mediaFile && (
    <Box mb={3} position="relative">
      <Typography variant="subtitle2" gutterBottom>
        Selected: {mediaFile.name} ({(mediaFile.size / 1024 / 1024).toFixed(2)}MB)
      </Typography>

      <Box border={1} borderColor="divider" borderRadius={2} p={2}>
        {mediaType === "image" && (
          <img
            src={URL.createObjectURL(mediaFile)}
            alt="Preview"
            style={{ maxWidth: "100%", maxHeight: "400px", objectFit: "contain" }}
          />
        )}

        {mediaType === "video" && (
          <video
            controls
            src={URL.createObjectURL(mediaFile)}
            style={{ maxWidth: "100%", maxHeight: "400px" }}
          />
        )}

        {mediaType === "audio" && (
          <audio controls src={URL.createObjectURL(mediaFile)} style={{ width: "100%" }} />
        )}

        {mediaType === "document" && (
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {renderDocumentIcon(mediaFile.type)}
              <Typography variant="body1">{mediaFile.name}</Typography>
            </Box>

            {mediaFile.type === "application/pdf" && (
              <Box height="400px" overflow="auto">
                <Document
                  file={URL.createObjectURL(mediaFile)}
                  onLoadSuccess={onDocumentLoadSuccess}
                >
                  {Array.from({ length: numPages || 1 }, (_, i) => (
                    <Page key={`page_${i + 1}`} pageNumber={i + 1} width={500} />
                  ))}
                </Document>
              </Box>
            )}
          </Box>
        )}

        <IconButton
          onClick={() => setMediaFile(null)}
          sx={{ position: "absolute", top: 8, right: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )}

  {loading && (
    <Box mb={2}>
      <LinearProgress variant="determinate" value={uploadProgress} sx={{ mb: 1 }} />
      <Typography variant="caption">
        Uploading: {uploadProgress}% ({uploadSpeed} KB/s)
      </Typography>
    </Box>
  )}

  <Button
    fullWidth
    variant="contained"
    color="primary"
    onClick={handleCreatePost}
    disabled={loading || (!postText.trim() && !mediaFile)}
  >
    {loading ? <CircularProgress size={24} color="inherit" /> : "Post"}
  </Button>
</motion.div>

      </Box>
    </Modal>
  );
};

export default CreatePost;