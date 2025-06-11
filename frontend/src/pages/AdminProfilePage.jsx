import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { motion } from "framer-motion";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Tabs,
  Tab,
  useMediaQuery,
  TextField,
  Grid,
  Chip,
  Badge,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  People,
  Block,
  Edit,
  ExitToApp,
  Search,
  Verified as VerifiedIcon,
  Security,
  Report,
  Gavel,
  VisibilityOff,
  Visibility,
  PersonRemove,
  PersonAdd,
  Delete,
  Restore,
  BarChart,
  Settings,
  AdminPanelSettings,
} from "@mui/icons-material";
import { ConfigProvider, App, message, theme } from "antd";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import { useSocket } from "../context/SocketContext";
import useShowToast from "../hooks/useShowToast";
import Post from "../components/Post";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

const AdminProfilePage = () => {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingPosts, setFetchingPosts] = useState(true);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [postsState, setPostsState] = useRecoilState(postsAtom);
  const currentUser = useRecoilValue(userAtom);
  const setCurrentUser = useSetRecoilState(userAtom);
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const isMediumScreen = useMediaQuery("(max-width:960px)");
  const [tabValue, setTabValue] = useState(0);
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const showToast = useShowToast();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalPosts: 0,
    activeUsers: 0,
    bannedUsers: 0,
    reportedPosts: 0,
  });
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);

  useEffect(() => {
    if (!socket) {
      console.warn("Socket is not initialized in AdminProfilePage");
      return;
    }

    socket.on("newPost", (post) => {
      setPostsState((prev) => ({
        ...prev,
        posts: [post, ...prev.posts],
      }));
      showToast("New Post", "A new post has been created", "info");
    });

    socket.on("postDeleted", ({ postId }) => {
      setPostsState((prev) => ({
        ...prev,
        posts: prev.posts.filter((p) => p._id !== postId),
      }));
      showToast("Post Deleted", "A post has been deleted", "info");
    });

    socket.on("userStatusUpdate", ({ userId, isBanned }) => {
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isBanned } : u))
      );
      setStats((prev) => ({
        ...prev,
        activeUsers: isBanned ? prev.activeUsers - 1 : prev.activeUsers + 1,
        bannedUsers: isBanned ? prev.bannedUsers + 1 : prev.bannedUsers - 1,
      }));
    });

    return () => {
      socket.off("newPost");
      socket.off("postDeleted");
      socket.off("userStatusUpdate");
    };
  }, [socket, setPostsState, showToast]);

  useEffect(() => {
    const getUser = async () => {
      try {
        let userData;
        if (currentUser && currentUser.username === username) {
          userData = currentUser;
        } else {
          const userRes = await fetch(`http://localhost:5000/api/users/profile/${username}`, {
            credentials: "include",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          userData = await userRes.json();
          if (!userRes.ok) throw new Error(userData.error || "User profile not found");
        }
        setUser(userData);
      } catch (error) {
        message.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    const getAllPosts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/posts/all", {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setPostsState((prev) => ({ ...prev, posts: data }));
        setStats((prev) => ({
          ...prev,
          totalPosts: data.length,
          reportedPosts: data.filter((p) => p.reports && p.reports.length > 0).length,
        }));
      } catch (error) {
        message.error(error.message);
      } finally {
        setFetchingPosts(false);
      }
    };

    const getAllUsers = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users/all", {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setUsers(data);
        setStats((prev) => ({
          ...prev,
          activeUsers: data.filter((u) => !u.isBanned).length,
          bannedUsers: data.filter((u) => u.isBanned).length,
        }));
      } catch (error) {
        message.error(error.message);
      } finally {
        setFetchingUsers(false);
      }
    };

    const getDashboardData = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users/admin/realtime-dashboard?range=week", {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch dashboard data");
        setDashboardData(data);
        setDashboardError(null);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
        showToast("Error", error.message || "Failed to fetch dashboard data", "error");
        setDashboardError(error.message || "Failed to fetch dashboard data");
        setDashboardData(null);
      }
    };

    if (currentUser?.isAdmin) {
      getUser();
      getAllPosts();
      getAllUsers();
      getDashboardData();
    }
  }, [username, currentUser, setPostsState, showToast]);

  const handleLogout = () => {
    localStorage.removeItem("user-NRBLOG");
    localStorage.removeItem("token");
    setCurrentUser(null);
    navigate("/auth");
    message.success("Logged out successfully");
  };

  const handleEditProfile = () => {
    navigate("/edit-profile");
  };

  const handleBanUnbanPost = async (postId, isBanned) => {
    try {
      const endpoint = isBanned ? `/api/posts/unban/${postId}` : `/api/posts/ban/${postId}`;
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPostsState((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => (p._id === postId ? { ...p, isBanned: !isBanned } : p)),
      }));
      socket?.emit("postStatusUpdate", { postId, isBanned: !isBanned });
      showToast("Success", data.message, "success");
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleBanUnbanUser = async (userId, isBanned) => {
    try {
      const endpoint = isBanned ? `/api/users/unban/${userId}` : `/api/users/ban/${userId}`;
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isBanned: !isBanned } : u))
      );
      socket?.emit("userStatusUpdate", { userId, isBanned: !isBanned });
      showToast("Success", data.message, "success");
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  if (!currentUser?.isAdmin) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 }, textAlign: "center" }}>
        <Typography variant={isSmallScreen ? "h6" : "h5"} color="text.primary">
          <AdminPanelSettings sx={{ verticalAlign: "middle", mr: 1, fontSize: { xs: 24, sm: 28 } }} />
          Admin access required
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress size={isSmallScreen ? 40 : 60} color="primary" />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Typography variant={isSmallScreen ? "h6" : "h5"} color="text.primary">
          User not found
        </Typography>
      </Box>
    );
  }

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Chart data preparation
  const activityChartData = dashboardData && {
    labels: dashboardData.activityData?.map((d) => d.date) || [],
    datasets: [
      {
        label: "Posts",
        data: dashboardData.activityData?.map((d) => d.posts) || [],
        borderColor: "#8515fe",
        backgroundColor: "rgba(133, 21, 254, 0.2)",
        fill: true,
      },
      {
        label: "Likes",
        data: dashboardData.activityData?.map((d) => d.likes) || [],
        borderColor: "#4caf50",
        backgroundColor: "rgba(76, 175, 80, 0.2)",
        fill: true,
      },
      {
        label: "Comments",
        data: dashboardData.activityData?.map((d) => d.comments) || [],
        borderColor: "#2196f3",
        backgroundColor: "rgba(33, 150, 243, 0.2)",
        fill: true,
      },
    ],
  };

  const userGrowthChartData = dashboardData && {
    labels: dashboardData.userGrowth?.map((d) => d.date) || [],
    datasets: [
      {
        label: "New Users",
        data: dashboardData.userGrowth?.map((d) => d.newUsers) || [],
        borderColor: "#8515fe",
        backgroundColor: "rgba(133, 21, 254, 0.2)",
        fill: true,
      },
    ],
  };

  const activeUsersChartData = dashboardData && {
    labels: dashboardData.userActivityByHour?.map((d) => `${d.hour}:00`) || [],
    datasets: [
      {
        label: "Active Users by Hour",
        data: dashboardData.userActivityByHour?.map((d) => d.users) || [],
        backgroundColor: "rgba(133, 21, 254, 0.5)",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { 
          color: "#ffffff",
          font: { size: isSmallScreen ? 10 : 12 },
          padding: isSmallScreen ? 10 : 20,
          boxWidth: isSmallScreen ? 30 : 40,
        },
        display: isSmallScreen ? false : true, // Hide legend on small screens
      },
      title: {
        display: true,
        color: "#ffffff",
        font: { size: isSmallScreen ? 14 : 16 },
      },
    },
    scales: {
      x: { 
        ticks: { 
          color: "#ffffff", 
          font: { size: isSmallScreen ? 10 : 12 },
          maxRotation: isSmallScreen ? 45 : 0,
        }, 
        grid: { color: "rgba(255, 255, 255, 0.1)" } 
      },
      y: { 
        ticks: { 
          color: "#ffffff", 
          font: { size: isSmallScreen ? 10 : 12 } 
        }, 
        grid: { color: "rgba(255, 255, 255, 0.1)" } 
      },
    },
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#8515fe",
          borderRadius: 8,
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
      }}
    >
      <App>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Box sx={{ minHeight: "100vh", px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 }, bgcolor: "#1a1a1a" }}>
            {/* Admin Header */}
            <Box sx={{ display: "flex", alignItems: "center", mb: { xs: 2, sm: 3 } }}>
              <Security sx={{ fontSize: { xs: 24, sm: 32 }, color: "#8515fe", mr: 2 }} />
              <Typography variant={isSmallScreen ? "h5" : "h4"} sx={{ fontWeight: 700, color: "text.primary" }}>
                Admin Dashboard
              </Typography>
              <Chip
                label="Super Admin"
                color="primary"
                icon={<AdminPanelSettings sx={{ fontSize: { xs: 16, sm: 20 } }} />}
                sx={{ ml: 2, px: 1, fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              />
            </Box>

            {/* Profile Card */}
            <Card
              sx={{
                mb: { xs: 2, sm: 3 },
                p: { xs: 1.5, sm: 2, md: 3 },
                maxWidth: { xs: '100%', sm: 800 },
                mx: "auto",
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                border: "2px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
                transition: "transform 0.3s",
                "&:hover": { transform: "scale(1.02)" },
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4} sx={{ textAlign: "center" }}>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    badgeContent={
                      <Tooltip title="Admin">
                        <AdminPanelSettings color="primary" sx={{ bgcolor: "background.paper", borderRadius: "50%", p: 0.5, fontSize: { xs: 20, sm: 24 } }} />
                      </Tooltip>
                    }
                  >
                    <Avatar
                      src={user.profilePic}
                      srcSet={`${user.profilePic}?w=80 1x, ${user.profilePic}?w=160 2x`}
                      alt={user.username}
                      sx={{
                        width: { xs: 80, sm: 100, md: 120 },
                        height: { xs: 80, sm: 100, md: 120 },
                        border: "3px solid rgba(255, 255, 255, 0.3)",
                        mx: "auto",
                      }}
                    />
                  </Badge>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Typography variant={isSmallScreen ? "h6" : "h5"} sx={{ fontWeight: 500, color: "text.primary", mr: 1 }}>
                      {user.username}
                    </Typography>
                    <VerifiedIcon color="primary" fontSize={isSmallScreen ? "small" : "medium"} />
                  </Box>
                  <Typography variant={isSmallScreen ? "caption" : "body2"} color="text.secondary" sx={{ mb: 2 }}>
                    {user.bio || "Administrator with full system privileges"}
                  </Typography>

                  {/* Admin Stats */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    {[
                      { label: "Total Posts", value: stats.totalPosts, icon: <BarChart fontSize={isSmallScreen ? "small" : "medium"} /> },
                      { label: "Active Users", value: stats.activeUsers, icon: <People fontSize={isSmallScreen ? "small" : "medium"} /> },
                      { label: "Banned Users", value: stats.bannedUsers, icon: <Block fontSize={isSmallScreen ? "small" : "medium"} /> },
                      { label: "Reported Posts", value: stats.reportedPosts, icon: <Report fontSize={isSmallScreen ? "small" : "medium"} /> },
                    ].map((stat) => (
                      <Grid item xs={6} sm={3} key={stat.label}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                          {stat.icon}
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {stat.label}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary", fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                          {stat.value}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>

                  <Box sx={{ display: "flex", gap: { xs: 1, sm: 2 }, flexWrap: "wrap" }}>
                    <Button
                      variant="contained"
                      onClick={handleEditProfile}
                      startIcon={<Edit />}
                      sx={{
                        borderRadius: 20,
                        px: { xs: 2, sm: 3 },
                        py: { xs: 0.5, sm: 1 },
                        bgcolor: "primary.main",
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        "&:hover": { bgcolor: "#6b12cb", transform: "scale(1.05)" },
                        transition: "transform 0.2s",
                        minWidth: { xs: 100, sm: 120 },
                      }}
                    >
                      Edit Profile
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => navigate("/admin/settings")}
                      startIcon={<Settings />}
                      sx={{
                        borderRadius: 20,
                        px: { xs: 2, sm: 3 },
                        py: { xs: 0.5, sm: 1 },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        "&:hover": { transform: "scale(1.05)" },
                        transition: "transform 0.2s",
                        minWidth: { xs: 100, sm: 120 },
                      }}
                    >
                      Admin Settings
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleLogout}
                      startIcon={<ExitToApp />}
                      sx={{
                        borderRadius: 20,
                        px: { xs: 2, sm: 3 },
                        py: { xs: 0.5, sm: 1 },
                        borderColor: "text.secondary",
                        color: "text.secondary",
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        "&:hover": { borderColor: "text.primary", color: "text.primary", transform: "scale(1.05)" },
                        transition: "transform 0.2s",
                        minWidth: { xs: 100, sm: 120 },
                      }}
                    >
                      Logout
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Card>

            {/* Tabs */}
            <Box
              sx={{
                position: "sticky",
                top: { xs: 8, sm: 16 },
                zIndex: 1000,
                bgcolor: "background.paper",
                borderRadius: 2,
                mb: { xs: 2, sm: 3 },
                border: "2px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
                py: { xs: 1, sm: 1.5 },
              }}
            >
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                variant={isSmallScreen ? "scrollable" : "standard"}
                scrollButtons={isSmallScreen}
                centered={!isSmallScreen}
                sx={{
                  "& .MuiTab-root": {
                    fontWeight: 500,
                    px: { xs: 1.5, sm: 3 },
                    py: { xs: 1, sm: 1.5 },
                    color: "text.secondary",
                    "&.Mui-selected": { color: "primary.main" },
                    minHeight: { xs: 48, sm: 64 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "primary.main",
                    height: 3,
                  },
                }}
              >
                <Tab icon={<People fontSize={isSmallScreen ? "small" : "medium"} />} iconPosition="start" label="User Management" />
                <Tab icon={<Gavel fontSize={isSmallScreen ? "small" : "medium"} />} iconPosition="start" label="Content Moderation" />
                <Tab icon={<Report fontSize={isSmallScreen ? "small" : "medium"} />} iconPosition="start" label="Reports" />
                <Tab icon={<BarChart fontSize={isSmallScreen ? "small" : "medium"} />} iconPosition="start" label="Analytics" />
              </Tabs>
            </Box>

            {/* Tab Content */}
            <Box sx={{ maxWidth: { xs: '100%', md: 1400 }, mx: "auto" }}>
              {tabValue === 0 && (
                <Box sx={{ py: { xs: 1, sm: 2 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: { xs: 2, sm: 3 }, flexWrap: "wrap", gap: 1 }}>
                    <TextField
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: <Search sx={{ color: "text.secondary", mr: 1, fontSize: { xs: 18, sm: 24 } }} />,
                      }}
                      sx={{
                        flex: { xs: '1 1 100%', sm: '1 1 500px' },
                        bgcolor: "background.paper",
                        borderRadius: 2,
                        "& .MuiInputBase-input": { 
                          py: { xs: 1, sm: 1.5 }, 
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          color: "text.primary" 
                        },
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                          "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.4)" },
                          "&.Mui-focused fieldset": { borderColor: "primary.main" },
                        },
                      }}
                    />
                    <Box sx={{ display: "flex", gap: 1, mt: { xs: 1, sm: 0 } }}>
                      <Chip
                        label={`Total: ${users.length}`}
                        color="primary"
                        variant="outlined"
                        sx={{ px: 1, fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      />
                      <Chip
                        label={`Active: ${stats.activeUsers}`}
                        color="success"
                        variant="outlined"
                        sx={{ px: 1, fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      />
                      <Chip
                        label={`Banned: ${stats.bannedUsers}`}
                        color="error"
                        variant="outlined"
                        sx={{ px: 1, fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      />
                    </Box>
                  </Box>

                  {fetchingUsers ? (
                    <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                      <CircularProgress sx={{ color: "primary.main" }} size={isSmallScreen ? 40 : 60} />
                    </Box>
                  ) : filteredUsers.length === 0 ? (
                    <Card
                      sx={{
                        p: { xs: 2, sm: 3 },
                        textAlign: "center",
                        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                        border: "2px solid rgba(255, 255, 255, 0.3)",
                      }}
                    >
                      <Typography variant={isSmallScreen ? "body2" : "body1"} color="text.primary">
                        No users found
                      </Typography>
                    </Card>
                  ) : (
                    <Grid container spacing={{ xs: 1, sm: 2 }}>
                      {filteredUsers.map((user) => (
                        <Grid item xs={12} sm={6} md={4} key={user._id}>
                          <Card
                            sx={{
                              transition: "transform 0.3s",
                              "&:hover": { transform: "scale(1.02)" },
                              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                              border: `2px solid ${user.isBanned ? "rgba(244, 67, 54, 0.3)" : "rgba(76, 175, 80, 0.3)"}`,
                              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
                              position: "relative",
                              overflow: "visible",
                            }}
                          >
                            {user.isAdmin && (
                              <Chip
                                label="Admin"
                                color="primary"
                                size="small"
                                icon={<AdminPanelSettings fontSize="small" />}
                                sx={{
                                  position: "absolute",
                                  top: -10,
                                  right: 10,
                                  fontWeight: 600,
                                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                }}
                              />
                            )}
                            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                <Avatar
                                  src={user.profilePic}
                                  srcSet={`${user.profilePic}?w=48 1x, ${user.profilePic}?w=96 2x`}
                                  alt={user.username}
                                  sx={{
                                    width: { xs: 36, sm: 48 },
                                    height: { xs: 36, sm: 48 },
                                    mr: 2,
                                    border: `2px solid ${user.isBanned ? "#f44336" : user.isAdmin ? "#8515fe" : "#4caf50"}`,
                                  }}
                                />
                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <Typography
                                      variant={isSmallScreen ? "body2" : "body1"}
                                      sx={{
                                        fontWeight: 500,
                                        color: "text.primary",
                                        cursor: "pointer",
                                        "&:hover": { textDecoration: "underline" },
                                        fontSize: { xs: '0.875rem', sm: '1rem' },
                                      }}
                                      onClick={() => navigate(`/${user.username}`)}
                                    >
                                      {user.username}
                                    </Typography>
                                    {user.isVerified && (
                                      <VerifiedIcon color="primary" fontSize={isSmallScreen ? "small" : "medium"} sx={{ ml: 0.5 }} />
                                    )}
                                  </Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              </Box>
                              <Divider sx={{ my: 1 }} />
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                    Status
                                  </Typography>
                                  <Chip
                                    label={user.isBanned ? "Banned" : "Active"}
                                    size="small"
                                    color={user.isBanned ? "error" : "success"}
                                    sx={{ ml: 1, fontWeight: 500, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                                  />
                                </Box>
                                <Box sx={{ display: "flex", gap: { xs: 0.5, sm: 1 } }}>
                                  <Tooltip title={user.isBanned ? "Unban User" : "Ban User"}>
                                    <IconButton
                                      onClick={() => handleBanUnbanUser(user._id, user.isBanned)}
                                      disabled={user.isAdmin}
                                      sx={{
                                        color: user.isBanned ? "#4caf50" : "#f44336",
                                        "&:hover": {
                                          bgcolor: user.isBanned ? "rgba(76, 175, 80, 0.1)" : "rgba(244, 67, 54, 0.1)",
                                          transform: "scale(1.1)",
                                        },
                                        transition: "transform 0.2s",
                                        fontSize: { xs: 18, sm: 24 },
                                      }}
                                    >
                                      {user.isBanned ? <Visibility /> : <VisibilityOff />}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="View Profile">
                                    <IconButton
                                      onClick={() => navigate(`/${user.username}`)}
                                      sx={{
                                        color: "text.secondary",
                                        "&:hover": {
                                          color: "primary.main",
                                          transform: "scale(1.1)",
                                        },
                                        transition: "transform 0.2s",
                                        fontSize: { xs: 18, sm: 24 },
                                      }}
                                    >
                                      <People />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}

              {tabValue === 1 && (
                <Box sx={{ py: { xs: 1, sm: 2 } }}>
                  <Box sx={{ mb: { xs: 2, sm: 3 } }}>
                    <Typography 
                      variant={isSmallScreen ? "h6" : "h5"} 
                      sx={{ fontWeight: 600, mb: 1, display: "flex", alignItems: "center" }}
                    >
                      <Gavel sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} /> Content Moderation
                    </Typography>
                    <Typography 
                      variant={isSmallScreen ? "caption" : "body2"} 
                      color="text.secondary" 
                      sx={{ mb: 2, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      Manage all posts and content on the platform
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
                      <Chip
                        label={`Total Posts: ${postsState.posts.length}`}
                        color="primary"
                        variant="outlined"
                        icon={<BarChart fontSize={isSmallScreen ? "small" : "medium"} />}
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      />
                      <Chip
                        label={`Banned Posts: ${postsState.posts.filter((p) => p.isBanned).length}`}
                        color="error"
                        variant="outlined"
                        icon={<Block fontSize={isSmallScreen ? "small" : "medium"} />}
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      />
                      <Chip
                        label={`Reported Posts: ${postsState.posts.filter((p) => p.reports && p.reports.length > 0).length}`}
                        color="warning"
                        variant="outlined"
                        icon={<Report fontSize={isSmallScreen ? "small" : "medium"} />}
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      />
                    </Box>
                  </Box>

                  <Tabs
                    value={tabValue === 1 ? 0 : 1}
                    onChange={(e, newValue) => setTabValue(newValue === 0 ? 1 : 2)}
                    variant={isSmallScreen ? "scrollable" : "standard"}
                    sx={{ mb: { xs: 2, sm: 3 } }}
                  >
                    <Tab 
                      label="Banned Posts" 
                      icon={<Block fontSize={isSmallScreen ? "small" : "medium"} />} 
                      iconPosition="start" 
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} 
                    />
                    <Tab 
                      label="Reported Content" 
                      icon={<Report fontSize={isSmallScreen ? "small" : "medium"} />} 
                      iconPosition="start" 
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} 
                    />
                  </Tabs>

                  {fetchingPosts ? (
                    <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                      <CircularProgress sx={{ color: "primary.main" }} size={isSmallScreen ? 40 : 60} />
                    </Box>
                  ) : postsState.posts.filter((p) => p.isBanned).length === 0 ? (
                    <Card
                      sx={{
                        p: { xs: 2, sm: 3 },
                        textAlign: "center",
                        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                        border: "2px solid rgba(255, 255, 255, 0.3)",
                      }}
                    >
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <Block sx={{ fontSize: { xs: 36, sm: 48 }, color: "text.secondary", mb: 2 }} />
                        <Typography variant={isSmallScreen ? "body2" : "h6"} color="text.primary" sx={{ mb: 1 }}>
                          No Banned Posts
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          All posts are currently active and visible to users
                        </Typography>
                      </Box>
                    </Card>
                  ) : (
                    <Grid container spacing={{ xs: 1, sm: 2 }}>
                      {postsState.posts
                        .filter((p) => p.isBanned)
                        .map((post) => (
                          <Grid item xs={12} sm={6} md={4} key={post._id}>
                            <Card
                              sx={{
                                position: "relative",
                                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                                border: "2px solid rgba(244, 67, 54, 0.3)",
                                boxShadow: "0 8px 24px rgba(244, 67, 54, 0.1)",
                              }}
                            >
                              <Chip
                                label="BANNED"
                                color="error"
                                size="small"
                                sx={{
                                  position: "absolute",
                                  top: 8,
                                  left: 8,
                                  fontWeight: 600,
                                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                  zIndex: 1,
                                }}
                              />
                              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                <Post post={post} postedBy={post.postedBy} isAdminView={true} />
                                <Box sx={{ display: "flex", gap: { xs: 1, sm: 2 }, mt: 2, flexWrap: "wrap" }}>
                                  <Button
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleBanUnbanPost(post._id, true)}
                                    startIcon={<Restore />}
                                    sx={{
                                      flex: 1,
                                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                      py: { xs: 0.5, sm: 1 },
                                      "&:hover": { transform: "scale(1.02)" },
                                      transition: "transform 0.2s",
                                      minWidth: { xs: 100, sm: 120 },
                                    }}
                                  >
                                    Restore Post
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<Delete />}
                                    sx={{
                                      flex: 1,
                                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                      py: { xs: 0.5, sm: 1 },
                                      "&:hover": { transform: "scale(1.02)" },
                                      transition: "transform 0.2s",
                                      minWidth: { xs: 100, sm: 120 },
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                    </Grid>
                  )}
                </Box>
              )}

              {tabValue === 2 && (
                <Box sx={{ py: { xs: 1, sm: 2 } }}>
                  <Typography 
                    variant={isSmallScreen ? "h6" : "h5"} 
                    sx={{ fontWeight: 600, mb: 2, display: "flex", alignItems: "center" }}
                  >
                    <Report sx={{ verticalAlign: "middle", mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                    Reported Content
                  </Typography>
                  <Typography 
                    variant={isSmallScreen ? "caption" : "body2"} 
                    color="text.secondary" 
                    sx={{ mb: 3, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    Review and take action on reported posts and comments
                  </Typography>

                  {postsState.posts.filter((p) => p.reports && p.reports.length > 0).length === 0 ? (
                    <Card
                      sx={{
                        p: { xs: 2, sm: 3 },
                        textAlign: "center",
                        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                        border: "2px solid rgba(255, 255, 255, 0.3)",
                      }}
                    >
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <VerifiedIcon sx={{ fontSize: { xs: 36, sm: 48 }, color: "text.secondary", mb: 2 }} />
                        <Typography variant={isSmallScreen ? "body2" : "h6"} color="text.primary" sx={{ mb: 1 }}>
                          No Reported Content
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          All content is currently clean with no reports
                        </Typography>
                      </Box>
                    </Card>
                  ) : (
                    <Grid container spacing={{ xs: 1, sm: 2 }}>
                      {postsState.posts
                        .filter((p) => p.reports && p.reports.length > 0)
                        .sort((a, b) => b.reports.length - a.reports.length)
                        .map((post) => (
                          <Grid item xs={12} key={post._id}>
                            <Card
                              sx={{
                                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                                border: "2px solid rgba(255, 165, 0, 0.3)",
                                boxShadow: "0 8px 24px rgba(255, 165, 0, 0.1)",
                              }}
                            >
                              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                  <Chip
                                    label={`${post.reports.length} Reports`}
                                    color="warning"
                                    variant="outlined"
                                    size="small"
                                    sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                                  />
                                  <Typography 
                                    variant="caption" 
                                    color="text.secondary" 
                                    sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                                  >
                                    Last reported: {new Date(Math.max(...post.reports.map((r) => new Date(r.timestamp)))).toLocaleString() || "N/A"}
                                  </Typography>
                                </Box>

                                <Post post={post} postedBy={post.postedBy} isAdminView={true} />

                                <Box sx={{ mt: 2 }}>
                                  <Typography 
                                    variant="subtitle2" 
                                    sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '0.875rem', sm: '1rem' } }}
                                  >
                                    Report Reasons:
                                  </Typography>
                                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                                    {post.reports.map((report, index) => (
                                      <Chip
                                        key={index}
                                        label={`${report.reason} (by ${report.reportedBy.username})`}
                                        size="small"
                                        sx={{
                                          bgcolor: "rgba(255, 165, 0, 0.1)",
                                          border: "1px solid rgba(255, 165, 0, 0.3)",
                                          fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                        }}
                                      />
                                    ))}
                                  </Box>
                                </Box>

                                <Box sx={{ display: "flex", gap: { xs: 1, sm: 2 }, mt: 2, flexWrap: "wrap" }}>
                                  <Button
                                    variant="contained"
                                    color="error"
                                    onClick={() => handleBanUnbanPost(post._id, false)}
                                    startIcon={<Block />}
                                    sx={{
                                      flex: 1,
                                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                      py: { xs: 0.5, sm: 1 },
                                      minWidth: { xs: 100, sm: 120 },
                                    }}
                                  >
                                    Ban Post
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<VerifiedIcon />}
                                    sx={{
                                      flex: 1,
                                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                      py: { xs: 0.5, sm: 1 },
                                      minWidth: { xs: 100, sm: 120 },
                                    }}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    color="secondary"
                                    startIcon={<PersonRemove />}
                                    sx={{
                                      flex: 1,
                                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                      py: { xs: 0.5, sm: 1 },
                                      minWidth: { xs: 100, sm: 120 },
                                    }}
                                  >
                                    Warn User
                                  </Button>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                    </Grid>
                  )}
                </Box>
              )}

              {tabValue === 3 && (
                <Box sx={{ py: { xs: 1, sm: 2 } }}>
                  <Typography 
                    variant={isSmallScreen ? "h6" : "h5"} 
                    sx={{ fontWeight: 600, mb: 2, display: "flex", alignItems: "center" }}
                  >
                    <BarChart sx={{ verticalAlign: "middle", mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                    Platform Analytics
                  </Typography>
                  <Typography 
                    variant={isSmallScreen ? "caption" : "body2"} 
                    color="text.secondary" 
                    sx={{ mb: 3, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    View real-time insights and statistics about platform usage
                  </Typography>

                  {dashboardError ? (
                    <Card
                      sx={{
                        p: { xs: 2, sm: 3 },
                        textAlign: "center",
                        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                        border: "2px solid rgba(255, 165, 0, 0.3)",
                      }}
                    >
                      <Typography variant={isSmallScreen ? "body2" : "h6"} color="error.main">
                        Failed to load analytics data
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {dashboardError}
                      </Typography>
                    </Card>
                  ) : !dashboardData ? (
                    <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                      <CircularProgress sx={{ color: "primary.main" }} size={isSmallScreen ? 40 : 60} />
                    </Box>
                  ) : (
                    <>
                      <Card
                        sx={{
                          p: { xs: 2, sm: 3 },
                          mb: { xs: 2, sm: 3 },
                          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                          border: "2px solid rgba(255, 255, 255, 0.3)",
                        }}
                      >
                        <Typography variant={isSmallScreen ? "h6" : "h5"} sx={{ fontWeight: 600, mb: 3 }}>
                          Key Metrics
                        </Typography>
                        <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
                          {[
                            { label: "Total Users", value: dashboardData.totalUsers || 0, icon: <People color="primary" fontSize={isSmallScreen ? "small" : "medium"} /> },
                            { label: "Total Posts", value: dashboardData.totalPosts || 0, icon: <BarChart color="success" fontSize={isSmallScreen ? "small" : "medium"} /> },
                            { label: "Total Likes", value: dashboardData.totalLikes || 0, icon: <Report color="warning" fontSize={isSmallScreen ? "small" : "medium"} /> },
                            { label: "Engagement Rate", value: `${dashboardData.engagementRate || 0}%`, icon: <PersonAdd color="info" fontSize={isSmallScreen ? "small" : "medium"} /> },
                          ].map((metric, index) => (
                            <Grid item xs={12} sm={6} md={3} key={index}>
                              <Card
                                sx={{
                                  p: { xs: 1.5, sm: 2 },
                                  height: "100%",
                                  background: "rgba(255, 255, 255, 0.03)",
                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                                  <Box sx={{ bgcolor: "rgba(133, 21, 254, 0.1)", p: 1, borderRadius: "50%", mr: 2 }}>
                                    {metric.icon}
                                  </Box>
                                  <Typography 
                                    variant="body2" 
                                    color="text.secondary" 
                                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                  >
                                    {metric.label}
                                  </Typography>
                                </Box>
                                <Typography 
                                  variant={isSmallScreen ? "h6" : "h5"} 
                                  sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}
                                >
                                  {metric.value}
                                </Typography>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Card>

                      <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
                        <Grid item xs={12} md={6}>
                          <Card
                            sx={{
                              p: { xs: 2, sm: 3 },
                              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                              border: "2px solid rgba(255, 255, 255, 0.3)",
                            }}
                          >
                            <Typography 
                              variant={isSmallScreen ? "h6" : "h5"} 
                              sx={{ fontWeight: 600, mb: 2 }}
                            >
                              Platform Activity (Last 7 Days)
                            </Typography>
                            <Box sx={{ height: { xs: 250, sm: 300 } }}>
                              <Line 
                                data={activityChartData} 
                                options={{ 
                                  ...chartOptions, 
                                  plugins: { 
                                    ...chartOptions.plugins, 
                                    title: { text: "Activity Trends", font: { size: isSmallScreen ? 14 : 16 } } 
                                  } 
                                }} 
                              />
                            </Box>
                          </Card>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Card
                            sx={{
                              p: { xs: 2, sm: 3 },
                              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                              border: "2px solid rgba(255, 255, 255, 0.3)",
                            }}
                          >
                            <Typography 
                              variant={isSmallScreen ? "h6" : "h5"} 
                              sx={{ fontWeight: 600, mb: 2 }}
                            >
                              User Growth (Last 7 Days)
                            </Typography>
                            <Box sx={{ height: { xs: 250, sm: 300 } }}>
                              <Line 
                                data={userGrowthChartData} 
                                options={{ 
                                  ...chartOptions, 
                                  plugins: { 
                                    ...chartOptions.plugins, 
                                    title: { text: "New User Registrations", font: { size: isSmallScreen ? 14 : 16 } } 
                                  } 
                                }} 
                              />
                            </Box>
                          </Card>
                        </Grid>
                        <Grid item xs={12}>
                          <Card
                            sx={{
                              p: { xs: 2, sm: 3 },
                              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
                              border: "2px solid rgba(255, 255, 255, 0.3)",
                            }}
                          >
                            <Typography 
                              variant={isSmallScreen ? "h6" : "h5"} 
                              sx={{ fontWeight: 600, mb: 2 }}
                            >
                              Active Users by Hour
                            </Typography>
                            <Box sx={{ height: { xs: 250, sm: 300 } }}>
                              <Bar 
                                data={activeUsersChartData} 
                                options={{ 
                                  ...chartOptions, 
                                  plugins: { 
                                    ...chartOptions.plugins, 
                                    title: { text: "Hourly User Activity", font: { size: isSmallScreen ? 14 : 16 } } 
                                  } 
                                }} 
                              />
                            </Box>
                          </Card>
                        </Grid>
                      </Grid>
                    </>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </motion.div>
      </App>
    </ConfigProvider>
  );
};

const FollowerCard = ({ followerId, currentUser, navigate }) => {
  const [follower, setFollower] = useState(null);
  const isSmallScreen = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    const fetchFollower = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/users/profile/${followerId}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (res.ok) setFollower(data);
      } catch (error) {
        console.error("Error fetching follower:", error);
      }
    };
    fetchFollower();
  }, [followerId]);

  if (!follower) return null;

  return (
    <Card
      sx={{
        transition: "transform 0.3s",
        "&:hover": { transform: "scale(1.02)" },
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
        position: "relative",
      }}
    >
      {follower.isBanned && (
        <Typography
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            color: "#f44336",
            fontWeight: 600,
            bgcolor: "rgba(255,255,255,0.1)",
            px: 1,
            py: 0.5,
            borderRadius: 2,
            fontSize: { xs: '0.65rem', sm: '0.75rem' },
          }}
        >
          Banned
        </Typography>
      )}
      <CardContent sx={{ display: "flex", alignItems: "center", p: { xs: 1, sm: 1.5 } }}>
        <Avatar 
          src={follower.profilePic} 
          srcSet={`${follower.profilePic}?w=40 1x, ${follower.profilePic}?w=80 2x`} 
          sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 }, mr: 2 }} 
        />
        <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
          <Typography
            variant="body2"
            sx={{ 
              fontWeight: 500, 
              color: "text.primary", 
              cursor: "pointer", 
              mr: 1, 
              fontSize: { xs: '0.75rem', sm: '0.875rem' } 
            }}
            onClick={() => navigate(`/${follower.username}`)}
          >
            {follower.username}
          </Typography>
          {follower.isVerified && (
            <VerifiedIcon color="primary" fontSize={isSmallScreen ? "small" : "medium"} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const FollowingCard = ({ followingId, currentUser, navigate }) => {
  const [followingUser, setFollowingUser] = useState(null);
  const isSmallScreen = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/users/profile/${followingId}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (res.ok) setFollowingUser(data);
      } catch (error) {
        console.error("Error fetching following user:", error);
      }
    };
    fetchFollowing();
  }, [followingId]);

  if (!followingUser) return null;

  return (
    <Card
      sx={{
        transition: "transform 0.3s",
        "&:hover": { transform: "scale(1.02)" },
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(133, 21, 254, 0.1))",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
        position: "relative",
      }}
    >
      {followingUser.isBanned && (
        <Typography
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            color: "#f44336",
            fontWeight: 600,
            bgcolor: "rgba(255,255,255,0.1)",
            px: 1,
            py: 0.5,
            borderRadius: 2,
            fontSize: { xs: '0.65rem', sm: '0.75rem' },
          }}
        >
          Banned
        </Typography>
      )}
      <CardContent sx={{ display: "flex", alignItems: "center", p: { xs: 1, sm: 1.5 } }}>
        <Avatar 
          src={followingUser.profilePic} 
          srcSet={`${followingUser.profilePic}?w=40 1x, ${followingUser.profilePic}?w=80 2x`} 
          sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 }, mr: 2 }} 
        />
        <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
          <Typography
            variant="body2"
            sx={{ 
              fontWeight: 500, 
              color: "text.primary", 
              cursor: "pointer", 
              mr: 1, 
              fontSize: { xs: '0.75rem', sm: '0.875rem' } 
            }}
            onClick={() => navigate(`/${followingUser.username}`)}
          >
            {followingUser.username}
          </Typography>
          {followingUser.isVerified && (
            <VerifiedIcon color="primary" fontSize={isSmallScreen ? "small" : "medium"} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AdminProfilePage;