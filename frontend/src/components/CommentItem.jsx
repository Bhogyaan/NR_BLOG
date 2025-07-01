import { useState, useEffect } from "react";
import { Avatar, Box, Button, Typography, TextField, IconButton } from "@mui/material";
import { message } from "antd";
import { formatDistanceToNow } from "date-fns";
import { Particles, initParticlesEngine } from "@tsparticles/react";
import { loadFull } from "tsparticles";
import PanToolIcon from '@mui/icons-material/PanTool';
import PanToolOutlinedIcon from '@mui/icons-material/PanToolOutlined';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { motion } from "framer-motion";

const LikeButton = ({ count, onLike, isLiked, disabled }) => {
  const [showParticles, setShowParticles] = useState(false);
  const [particlesLoaded, setParticlesLoaded] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadFull(engine);
      setParticlesLoaded(true);
    });
  }, []);

  const handleLike = () => {
    if (!disabled && particlesLoaded) {
      setShowParticles(true);
      onLike();
      setTimeout(() => setShowParticles(false), 1000);
    }
  };

  return (
    <Box sx={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <IconButton
        component={motion.button}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleLike}
        disabled={disabled || !particlesLoaded}
        sx={{
          color: isLiked ? "#ED4956" : "#1C2526", // Changed to dark gray for better contrast
          "&:hover": { color: "#ED4956" },
        }}
      >
        {isLiked ? (
          <PanToolIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
        ) : (
          <PanToolOutlinedIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
        )}
        <Typography variant="caption" sx={{ ml: 0.5, color: "#1C2526" }}>
          {count || 0}
        </Typography>
      </IconButton>
      {showParticles && particlesLoaded && (
        <Particles
          id={`like-particles-${Math.random()}`}
          options={{
            particles: {
              number: { value: 20, density: { enable: true, value_area: 800 } },
              color: { value: ["#ED4956", "#FFA500", "#FF4500"] },
              shape: { type: "circle" },
              opacity: { value: 0.5, random: true },
              size: { value: 5, random: true },
              move: {
                enable: true,
                speed: 6,
                direction: "top",
                random: true,
                out_mode: "out",
              },
            },
            interactivity: { events: { onhover: { enable: false }, onclick: { enable: false } } },
            retina_detect: true,
          }}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        />
      )}
    </Box>
  );
};

const CommentItem = ({
  comment,
  currentUser,
  postId,
  postPostedBy,
  onEdit,
  onDelete,
  onLike,
  fetchComments,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.text);
  const [isLiked, setIsLiked] = useState(
    currentUser && comment.likes?.includes(currentUser._id?.toString())
  );
  const [likeCount, setLikeCount] = useState(comment.likes?.length || 0);
  const [isLoading, setIsLoading] = useState(false);

  const commentUser = {
    username: comment.username || "Unknown User",
    profilePic: comment.userProfilePic || "/default-avatar.png",
  };

  const isValidDate = comment.createdAt && !isNaN(new Date(comment.createdAt).getTime());

  const currentUserId = currentUser?._id?.toString();
  const commentUserId = comment.userId?.toString();
  const postPostedById = postPostedBy?.toString();

  const canEdit = currentUser && (currentUserId === commentUserId || currentUser?.isAdmin);
  const canDelete = currentUser && (
    currentUserId === commentUserId || 
    currentUserId === postPostedById || 
    currentUser?.isAdmin
  );

  const handleLike = async () => {
    if (!currentUser) {
      message.error("Please login to like comments");
      return;
    }
    try {
      setIsLoading(true);
      const newLikes = await onLike(comment._id);
      setIsLiked(!isLiked);
      setLikeCount(newLikes.length);
    } catch (error) {
      message.error(error.message || "Failed to like comment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!currentUser) {
      message.error("Please login to edit comments");
      return;
    }
    if (!editedText.trim()) {
      message.error("Comment cannot be empty");
      return;
    }
    try {
      setIsLoading(true);
      await onEdit(comment._id, editedText);
      setIsEditing(false);
      message.success("Comment updated successfully");
    } catch (error) {
      message.error(error.message || "Failed to edit comment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser) {
      message.error("Please login to delete comments");
      return;
    }
    try {
      setIsLoading(true);
      await onDelete(comment._id);
      message.success("Comment deleted successfully");
    } catch (error) {
      message.error(error.message || "Failed to delete comment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        mt: 1,
        p: 1.2,
        bgcolor: 'rgba(255,255,255,0.15)',
        borderRadius: 3,
        borderLeft: '4px solid #8515fe',
        boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.10)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        position: 'relative',
        transition: 'box-shadow 0.2s, transform 0.2s',
        minHeight: 48,
        mb: 1.5,
        '&:hover': {
          boxShadow: '0 8px 24px 0 rgba(133, 21, 254, 0.12)',
          transform: 'translateY(-1px) scale(1.01)',
        },
      }}
    >
      {/* First row: Avatar, Username, Timestamp */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
        <Avatar
          src={commentUser.profilePic}
          alt={commentUser.username}
          sx={{
            width: 28,
            height: 28,
            border: '1.5px solid #8515fe',
            boxShadow: '0 1px 4px rgba(133, 21, 254, 0.08)',
          }}
        />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#8515fe', fontFamily: 'Poppins, sans-serif', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
          {commentUser.username}
        </Typography>
        {isValidDate && (
          <Typography
            variant="caption"
            sx={{ color: '#6b12cb', fontWeight: 400, fontFamily: 'Poppins, sans-serif', fontSize: '0.82rem', ml: 1, whiteSpace: 'nowrap' }}
          >
            {`${formatDistanceToNow(new Date(comment.createdAt))} ago${comment.isEdited ? " (Edited)" : ""}`}
          </Typography>
        )}
      </Box>
      {/* Second row: Comment text */}
      <Box sx={{ mt: 0.5, mb: 0.5 }}>
        {isEditing ? (
          <TextField
            fullWidth
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            multiline={false}
            sx={{
              bgcolor: 'rgba(255,255,255,0.4)',
              borderRadius: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#8515fe' },
                '&:hover fieldset': { borderColor: '#6b12cb' },
                '&.Mui-focused fieldset': { borderColor: '#8515fe' },
                '& .MuiInputBase-input': { color: '#1C2526', fontSize: '0.98rem', p: 0.5 },
              },
              minWidth: 120,
              maxWidth: 220,
            }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{ wordBreak: 'break-word', color: '#1C2526', fontFamily: 'Poppins, sans-serif', fontSize: '0.98rem', lineHeight: 1.4 }}
          >
            {comment.text}
          </Typography>
        )}
      </Box>
      {/* Third row: Like, Edit, Delete */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
        <LikeButton
          count={likeCount}
          onLike={handleLike}
          isLiked={isLiked}
          disabled={!currentUser || isLoading}
        />
        {currentUser && (
          <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
            {canEdit && (
              <IconButton
                size="small"
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
                sx={{
                  color: '#6b12cb',
                  bgcolor: 'rgba(133, 21, 254, 0.08)',
                  borderRadius: 2,
                  p: 0.5,
                  transition: 'background 0.2s',
                  '&:hover': { bgcolor: '#8515fe', color: '#fff' },
                }}
              >
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
            {canDelete && (
              <IconButton
                size="small"
                onClick={handleDelete}
                disabled={isLoading}
                sx={{
                  color: '#fff',
                  bgcolor: '#ED4956',
                  borderRadius: 2,
                  p: 0.5,
                  transition: 'background 0.2s',
                  '&:hover': { bgcolor: '#b71c1c' },
                }}
              >
                <DeleteForeverIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CommentItem;