import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  IconButton,
  useMediaQuery,
  Chip,
} from "@mui/material";
import {
  Dashboard,
  BarChart as BarChartIcon,
  TrendingUp,
  MoreVert,
  Gavel,
  People,
  ThumbUp,
  Comment,
  Bookmark,
  Share,
  AccessTime,
  GroupAdd,
  PostAdd,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { SocketContext } from "../context/SocketContext";
import useShowToast from "../hooks/useShowToast";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const AdminDashboard = () => {
  const showToast = useShowToast();
  const currentUser = useRecoilValue(userAtom);
  const { socket, connectionStatus } = useContext(SocketContext); // Destructure socket
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const isMediumScreen = useMediaQuery("(max-width:960px)");
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("week");

  const defaultAnalytics = {
    totalPosts: 0,
    totalUsers: 0,
    totalLikes: 0,
    totalComments: 0,
    totalBookmarks: 0,
    totalShares: 0,
    bannedPosts: 0,
    bannedUsers: 0,
    activityData: [],
    userActivityByHour: [],
    userGrowth: [],
    postGrowth: [],
    recentPosts: [],
    engagementRate: 0,
  };

  const refreshToken = async () => {
    try {
      const res = await fetch("/api/auth/refresh-token", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.token) {
        localStorage.setItem("token", data.token);
        return data.token;
      }
      throw new Error("Failed to refresh token");
    } catch (error) {
      console.error("Token refresh failed:", error.message);
      setError("Authentication failed. Please log in again.");
      return null;
    }
  };

  const fetchAnalytics = async (retries = 3, delay = 1000) => {
    try {
      setLoadingAnalytics(true);
      let token = localStorage.getItem("token");
      if (!token) {
        token = await refreshToken();
        if (!token) throw new Error("No authentication token found");
      }

      const res = await fetch(`/api/admin/realtime-dashboard?range=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (res.status === 401 && retries > 0) {
        const newToken = await refreshToken();
        if (newToken) {
          localStorage.setItem("token", newToken);
          return fetchAnalytics(retries - 1, delay * 2);
        }
        throw new Error("Unauthorized access. Please log in again.");
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch analytics: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalytics(data);
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchAnalytics(retries - 1, delay * 2);
      }
      console.error("Failed to fetch analytics:", error.message);
      setError(error.message);
      showToast("Error", error.message, "error");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.isAdmin) return;
    fetchAnalytics();
  }, [currentUser, timeRange]);

  useEffect(() => {
    if (!socket) {
      console.warn("Socket not initialized in AdminDashboard. Real-time updates disabled.");
      showToast("Warning", "Real-time updates are disabled due to socket initialization failure", "warning");
      return;
    }

    console.log("Socket connection status:", connectionStatus, socket.id || "No ID");

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      showToast("Success", "Real-time updates enabled", "success");
    });

    socket.on("disconnect", () => {
      console.warn("Socket disconnected");
      showToast("Warning", "Real-time updates disabled", "warning");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      showToast("Error", "Failed to connect to real-time updates", "error");
    });

    const handleAnalyticsUpdate = (update) => {
      setAnalytics((prev) => ({
        ...prev,
        ...update,
        activityData: update.activityData || prev.activityData,
        userActivityByHour: update.userActivityByHour || prev.userActivityByHour,
        userGrowth: update.userGrowth || prev.userGrowth,
        postGrowth: update.postGrowth || prev.postGrowth,
        recentPosts: update.recentPosts || prev.recentPosts,
      }));
      showToast("Update", "Analytics data refreshed", "info");
    };

    socket.on("analyticsUpdate", handleAnalyticsUpdate);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("analyticsUpdate", handleAnalyticsUpdate);
    };
  }, [socket, connectionStatus, showToast]);

  const handleToggleBanPost = async (postId, isBanned) => {
    try {
      const endpoint = isBanned ? `/api/posts/unban/${postId}` : `/api/posts/ban/${postId}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalytics((prev) => ({
        ...prev,
        recentPosts: prev.recentPosts.map((p) => (p._id === postId ? { ...p, isBanned: !isBanned } : p)),
        bannedPosts: isBanned ? prev.bannedPosts - 1 : prev.bannedPosts + 1,
      }));
      if (socket) {
        socket.emit("postStatusUpdate", { postId, isBanned: !isBanned });
      }
      showToast("Success", data.message, "success");
    } catch (error) {
      console.error("Error banning/unbanning post:", error.message);
      showToast("Error", error.message, "error");
    }
  };

  const handleToggleBanUser = async (userId, isBanned) => {
    try {
      const endpoint = isBanned ? `/api/users/unban/${userId}` : `/api/users/ban/${userId}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalytics((prev) => ({
        ...prev,
        bannedUsers: isBanned ? prev.bannedUsers - 1 : prev.bannedUsers + 1,
      }));
      if (socket) {
        socket.emit("userStatusUpdate", { userId, isBanned: !isBanned });
      }
      showToast("Success", data.message, "success");
    } catch (error) {
      console.error("Error banning/unbanning user:", error.message);
      showToast("Error", error.message, "error");
    }
  };

  if (!currentUser?.isAdmin) {
    return (
      <Box sx={{ p: 3, textAlign: "center", bgcolor: "background.paper", borderRadius: 2 }}>
        <Typography variant="h6" color="text.primary">
          Admin access required
        </Typography>
      </Box>
    );
  }

  if (loadingAnalytics) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !analytics) {
    return (
      <Box sx={{ p: 3, textAlign: "center", bgcolor: "background.paper", borderRadius: 2 }}>
        <Typography variant="h6" color="error">
          {error || "Unable to load analytics data"}
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setError(null);
            fetchAnalytics();
          }}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  const pieData = [
    { name: "Active Users", value: analytics.totalUsers - analytics.bannedUsers },
    { name: "Banned Users", value: analytics.bannedUsers },
    { name: "Active Posts", value: analytics.totalPosts - analytics.bannedPosts },
    { name: "Banned Posts", value: analytics.bannedPosts },
  ];

  const barData = analytics.activityData.map((item) => ({
    date: item.date,
    posts: item.posts,
    likes: item.likes,
    comments: item.comments,
  }));

  const hourlyActivityData = analytics.userActivityByHour.map((item) => ({
    hour: `${item.hour}:00`,
    users: item.users,
  }));

  const userGrowthData = analytics.userGrowth.map((item) => ({
    date: item.date,
    newUsers: item.newUsers,
  }));

  const postGrowthData = analytics.postGrowth.map((item) => ({
    date: item.date,
    newPosts: item.newPosts,
  }));

  const summaryCards = [
    { icon: <People />, title: "Total Users", value: analytics.totalUsers, color: "#0088FE" },
    { icon: <Dashboard />, title: "Total Posts", value: analytics.totalPosts, color: "#00C49F" },
    { icon: <ThumbUp />, title: "Total Likes", value: analytics.totalLikes, color: "#FFBB28" },
    { icon: <Comment />, title: "Total Comments", value: analytics.totalComments, color: "#FF8042" },
    { icon: <Bookmark />, title: "Total Bookmarks", value: analytics.totalBookmarks, color: "#8884d8" },
    { icon: <Share />, title: "Total Shares", value: analytics.totalShares, color: "#82ca9d" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-900 text-white p-4 md:p-6"
    >
      <Box sx={{ maxWidth: "1400px", mx: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 4, flexWrap: "wrap" }}>
          <Dashboard sx={{ mr: 1, color: "#8515fe" }} />
          <Typography variant="h4" sx={{ mr: 2, fontWeight: 700 }}>
            Admin Dashboard
          </Typography>
          <Box sx={{ display: "flex", ml: "auto", gap: 1 }}>
            {["week", "month", "year"].map((range) => (
              <Chip
                key={range}
                label={range.charAt(0).toUpperCase() + range.slice(1)}
                onClick={() => setTimeRange(range)}
                color={timeRange === range ? "primary" : "default"}
                variant={timeRange === range ? "filled" : "outlined"}
                sx={{ borderRadius: "16px", fontWeight: 500 }}
              />
            ))}
          </Box>
        </Box>

        <Grid container spacing={3}>
          {summaryCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
              <Card
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  border: "2px solid rgba(255, 255, 255, 0.2)",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "scale(1.03)" },
                }}
              >
                <CardContent sx={{ textAlign: "center" }}>
                  <Box sx={{ color: card.color, mb: 1 }}>{card.icon}</Box>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {card.value.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.05)",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <BarChartIcon sx={{ mr: 1, color: "#8515fe" }} />
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    Platform Overview
                  </Typography>
                </Box>
                <ResponsiveContainer width="100%" height={isSmallScreen ? 250 : 300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={isSmallScreen ? 80 : 100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.05)",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <AccessTime sx={{ mr: 1, color: "#8515fe" }} />
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    User Activity by Hour
                  </Typography>
                </Box>
                <ResponsiveContainer width="100%" height={isSmallScreen ? 250 : 300}>
                  <AreaChart data={hourlyActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="users" stroke="#8884d8" fill="#8884d8" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.05)",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <GroupAdd sx={{ mr: 1, color: "#8515fe" }} />
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    User Growth
                  </Typography>
                </Box>
                <ResponsiveContainer width="100%" height={isSmallScreen ? 250 : 300}>
                  <LineChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="newUsers" stroke="#00C49F" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.05)",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <PostAdd sx={{ mr: 1, color: "#8515fe" }} />
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    Post Growth
                  </Typography>
                </Box>
                <ResponsiveContainer width="100%" height={isSmallScreen ? 250 : 300}>
                  <LineChart data={postGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="newPosts" stroke="#FFBB28" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.05)",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <TrendingUp sx={{ mr: 1, color: "#8515fe" }} />
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    Activity Over Time
                  </Typography>
                </Box>
                <ResponsiveContainer width="100%" height={isSmallScreen ? 300 : 400}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="posts" fill="#0088FE" />
                    <Bar dataKey="likes" fill="#00C49F" />
                    <Bar dataKey="comments" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.05)",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 500, mb: 2 }}>
                  Recent Posts
                </Typography>
                <Grid container spacing={2}>
                  {analytics.recentPosts?.map((post) => (
                    <Grid item xs={12} sm={6} md={4} key={post._id}>
                      <Card sx={{ position: "relative", bgcolor: "rgba(255, 255, 255, 0.05)" }}>
                        <CardContent>
                          <Typography variant="subtitle1">{post.text || "No content"}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            By {post.postedBy?.username || "Unknown"} on{" "}
                            {new Date(post.createdAt).toLocaleDateString()}
                          </Typography>
                          {post.isBanned && (
                            <Chip
                              label="Banned"
                              color="error"
                              size="small"
                              sx={{ position: "absolute", top: 8, left: 8 }}
                            />
                          )}
                          <IconButton
                            sx={{ position: "absolute", top: 8, right: 8 }}
                            onClick={(e) => {
                              setAnchorEl(e.currentTarget);
                              setSelectedPost(post);
                            }}
                          >
                            <MoreVert />
                          </IconButton>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem
            onClick={() => {
              handleToggleBanPost(selectedPost._id, selectedPost.isBanned);
              setAnchorEl(null);
            }}
          >
            <Gavel sx={{ mr: 1 }} />
            {selectedPost?.isBanned ? "Unban Post" : "Ban Post"}
          </MenuItem>
          {selectedPost?.postedBy && (
            <MenuItem
              onClick={() => {
                handleToggleBanUser(selectedPost.postedBy._id, selectedPost.postedBy.isBanned);
                setAnchorEl(null);
              }}
            >
              <Gavel sx={{ mr: 1 }} />
              {selectedPost.postedBy?.isBanned ? "Unban User" : "Ban User"}
            </MenuItem>
          )}
        </Menu>
      </Box>
    </motion.div>
  );
};

export default AdminDashboard;