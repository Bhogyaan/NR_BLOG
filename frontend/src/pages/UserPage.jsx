import { useEffect, useState } from "react";
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
  Chip,
  IconButton,
  Tooltip,
  Divider,
  useTheme,
} from "@mui/material";
import { ConfigProvider, App, message } from "antd";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import { useSocket } from "../context/SocketContext";
import useBookmark from "../hooks/useBookmark";
import useFollowUnfollow from "../hooks/useFollowUnfollow";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ChartTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { 
  Verified as VerifiedIcon,
  Edit,
  ExitToApp,
  PersonAdd,
  PersonRemove,
  Bookmark,
  Dashboard,
} from "@mui/icons-material";
import Post from "../components/Post";
import AdminProfilePage from "./AdminProfilePage";

const UserPage = () => {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingPosts, setFetchingPosts] = useState(true);
  const [fetchingBookmarks, setFetchingBookmarks] = useState(true);
  const [postsState, setPostsState] = useRecoilState(postsAtom);
  const currentUser = useRecoilValue(userAtom);
  const setCurrentUser = useSetRecoilState(userAtom);
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery("(max-width: 600px)");
  const [tabValue, setTabValue] = useState(0);
  const { handleBookmark } = useBookmark();
  const { handleFollowUnfollow, updating, following } = useFollowUnfollow(user);
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const theme = useTheme();

  // Redirect admin to AdminProfilePage if viewing their own profile
  if (currentUser?.isAdmin && currentUser?.username === username) {
    return <AdminProfilePage />;
  }

  // Use theme colors for charts
  const COLORS = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.error.main];

  useEffect(() => {
    if (!currentUser) {
      navigate("/auth");
      return;
    }

    const getUserAndStats = async () => {
      try {
        let userData;
        if (currentUser && currentUser.username === username) {
          userData = currentUser;
        } else {
          const userRes = await fetch(`/api/users/profile/${username}`, {
            credentials: "include",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          if (!userRes.ok) throw new Error("User profile not found");
          userData = await userRes.json();
        }

        let statsData = {};
        try {
          const statsRes = await fetch(`/api/users/stats/${username}`, {
            credentials: "include",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          statsData = statsRes.ok
            ? await statsRes.json()
            : { totalLikes: 0, totalPosts: 0, totalComments: 0, activityData: [] };
        } catch (statsError) {
          console.warn("Stats endpoint not available:", statsError.message);
          statsData = { totalLikes: 0, totalPosts: 0, totalComments: 0, activityData: [] };
        }

        setUser({ ...userData, stats: statsData });
      } catch (error) {
        console.error("Error fetching user and stats:", error.stack);
        message.error(error.message || "Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    const getPosts = async () => {
      try {
        const endpoint = currentUser?.isAdmin ? "/api/posts/all" : `/api/posts/user/${username}`;
        const res = await fetch(endpoint, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const enrichedPosts = data.map((post) => ({
          ...post,
          postedBy: post.postedBy._id
            ? post.postedBy
            : { _id: post.postedBy, username: user?.username, profilePic: user?.profilePic },
        }));
        setPostsState((prev) => ({ ...prev, posts: enrichedPosts }));
      } catch (error) {
        console.error("Error fetching posts:", error.stack);
        message.error(error.message || "Failed to load posts");
      } finally {
        setFetchingPosts(false);
      }
    };

    const getBookmarks = async () => {
      try {
        const res = await fetch(`/api/posts/bookmarks/${username}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (res.ok) {
          const enrichedBookmarks = data.map((post) => ({
            ...post,
            postedBy: post.postedBy._id
              ? post.postedBy
              : { _id: post.postedBy, username: user?.username, profilePic: user?.profilePic },
          }));
          setPostsState((prev) => ({ ...prev, bookmarks: enrichedBookmarks || [] }));
        } else {
          throw new Error(data.error || "Failed to fetch bookmarks");
        }
      } catch (error) {
        console.error("Error fetching bookmarks:", error.stack);
        message.error(error.message || "Failed to load bookmarks");
      } finally {
        setFetchingBookmarks(false);
      }
    };

    getUserAndStats();
    getPosts();
    getBookmarks();
  }, [username, currentUser, setPostsState, user?.username, user?.profilePic, navigate]);

  useEffect(() => {
    if (!socket || !currentUser) {
      if (currentUser && !socket) console.warn("Socket is not initialized in UserPage");
      return;
    }

    const handleUserFollowed = ({ followedId, follower }) => {
      if (followedId === user?._id) {
        setUser((prev) => ({
          ...prev,
          followers: [...(prev.followers || []), follower._id],
        }));
      }
      if (follower._id === user?._id) {
        setUser((prev) => ({
          ...prev,
          following: [...(prev.following || []), followedId],
        }));
      }
    };

    const handleUserUnfollowed = ({ unfollowedId, follower }) => {
      if (unfollowedId === user?._id) {
        setUser((prev) => ({
          ...prev,
          followers: prev.followers?.filter((id) => id !== follower._id) || [],
        }));
      }
      if (follower._id === user?._id) {
        setUser((prev) => ({
          ...prev,
          following: prev.following?.filter((id) => id !== unfollowedId) || [],
        }));
      }
    };

    socket.on("userFollowed", handleUserFollowed);
    socket.on("userUnfollowed", handleUserUnfollowed);

    socket.on("newPost", (post) => {
      if (post.postedBy._id === user?._id || currentUser.following.includes(post.postedBy._id)) {
        setPostsState((prev) => ({
          ...prev,
          posts: [post, ...prev.posts],
        }));
      }
    });

    socket.on("postDeleted", ({ postId, userId }) => {
      if (userId === user?._id) {
        setPostsState((prev) => ({
          ...prev,
          posts: prev.posts.filter((p) => p._id !== postId),
          bookmarks: prev.bookmarks.filter((p) => p._id !== postId),
        }));
      }
    });

    return () => {
      socket.off("userFollowed", handleUserFollowed);
      socket.off("userUnfollowed", handleUserUnfollowed);
      socket.off("newPost");
      socket.off("postDeleted");
    };
  }, [socket, user, currentUser, setPostsState]);

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

  const handleBanUnbanUser = async () => {
    if (!currentUser?.isAdmin) {
      message.error("Unauthorized action");
      return;
    }
    try {
      const action = user.isBanned ? "unban" : "ban";
      const res = await fetch(`/api/users/${action}/${user._id}`, {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUser((prev) => ({ ...prev, isBanned: !prev.isBanned }));
        message.success(`User ${action}ned successfully`);
      } else {
        throw new Error(data.error || `Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`Error ${user.isBanned ? "unbanning" : "banning"} user:`, error.stack);
      message.error(error.message || `Failed to ${user.isBanned ? "unban" : "ban"} user`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Typography variant="h6" color="text.primary">
          User not found
        </Typography>
      </Box>
    );
  }

  const pieData = [
    { name: "Likes", value: user.stats?.totalLikes || 0 },
    { name: "Posts", value: user.stats?.totalPosts || 0 },
    { name: "Comments", value: user.stats?.totalComments || 0 },
  ];

  const barData = user.stats?.activityData || [];
  const lineData = user.stats?.activityData || [];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: theme.palette.primary.main,
          borderRadius: 8,
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
      }}
    >
      <App>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Box sx={{ minHeight: "100vh", p: isSmallScreen ? 1 : 3, pb: isSmallScreen ? 8 : 0, bgcolor: theme.palette.background.default }}>
            {/* Profile Header Card */}
            <Card
              sx={{
                mb: 3,
                p: 2,
                bgcolor: theme.palette.background.paper,
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                width: "100%",
                maxWidth: 600,
                mx: "auto",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flexDirection: isSmallScreen ? "column" : "row",
                  gap: 2,
                }}
              >
                <Avatar
                  src={user.profilePic || undefined}
                  alt={user.username}
                  sx={{
                    width: isSmallScreen ? 80 : 120,
                    height: isSmallScreen ? 80 : 120,
                    border: "2px solid rgba(255, 255, 255, 0.2)",
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                        {user.username}
                      </Typography>
                      {user.isBanned && (
                        <Chip
                          label="Banned"
                          size="small"
                          color="error"
                          sx={{ ml: 1, fontSize: "0.6rem", height: 20 }}
                        />
                      )}
                      {user.isVerified && (
                        <Tooltip title="Verified">
                          <VerifiedIcon color="primary" fontSize="small" />
                        </Tooltip>
                      )}
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {!currentUser || !user || currentUser._id === user._id ? (
                        <>
                          <Tooltip title="Edit Profile">
                            <IconButton
                              onClick={handleEditProfile}
                              sx={{
                                color: theme.palette.text.primary,
                                bgcolor: "rgba(255, 255, 255, 0.1)",
                                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Logout">
                            <IconButton
                              onClick={handleLogout}
                              sx={{
                                color: theme.palette.text.primary,
                                bgcolor: "rgba(255, 255, 255, 0.1)",
                                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                              }}
                            >
                              <ExitToApp fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          {currentUser?._id !== user._id && (
                            <Button
                              variant={following ? "outlined" : "contained"}
                              size="small"
                              onClick={handleFollowUnfollow}
                              disabled={updating || user.isBanned}
                              startIcon={following ? <PersonRemove /> : <PersonAdd />}
                              sx={{
                                borderRadius: 20,
                                textTransform: "none",
                                bgcolor: following ? "transparent" : theme.palette.primary.main,
                                color: following ? theme.palette.primary.main : theme.palette.text.primary,
                                borderColor: following ? theme.palette.primary.main : "transparent",
                                "&:hover": { bgcolor: following ? "rgba(133, 21, 254, 0.1)" : "#6b12cb" },
                              }}
                            >
                              {following ? "Following" : "Follow"}
                            </Button>
                          )}
                          {currentUser?.isAdmin && (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={handleBanUnbanUser}
                              sx={{
                                borderRadius: 20,
                                textTransform: "none",
                                borderColor: user.isBanned ? "success.main" : "error.main",
                                color: user.isBanned ? "success.main" : "error.main",
                                "&:hover": {
                                  bgcolor: user.isBanned ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 0, 0, 0.1)",
                                },
                              }}
                            >
                              {user.isBanned ? "Unban" : "Ban"}
                            </Button>
                          )}
                        </>
                      )}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      mb: 2,
                      justifyContent: isSmallScreen ? "center" : "flex-start",
                    }}
                  >
                    <Box sx={{ textAlign: "center", minWidth: 60 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                        {postsState.posts.length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Posts
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center", minWidth: 60 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                        {user.followers?.length || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Followers
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center", minWidth: 60 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                        {user.following?.length || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Following
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      {user.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: "pre-wrap" }}
                    >
                      {user.bio || "No bio yet"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Card>

            {/* Navigation Tabs */}
            <Box
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 1000,
                bgcolor: theme.palette.background.paper,
                borderRadius: "12px",
                overflowX: "auto",
                width: "100%",
                maxWidth: 600,
                mx: "auto",
                mb: 2,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
              }}
            >
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                variant={isSmallScreen ? "scrollable" : "fullWidth"}
                scrollButtons={isSmallScreen ? true : false}
                allowScrollButtonsMobile
                sx={{
                  "& .MuiTab-root": {
                    minWidth: isSmallScreen ? "100px" : "auto",
                    padding: isSmallScreen ? "6px 12px" : "12px 16px",
                    color: theme.palette.text.secondary,
                    "&.Mui-selected": { color: theme.palette.primary.main },
                    whiteSpace: "nowrap",
                    textTransform: "none",
                    fontWeight: 600,
                  },
                  "& .MuiTabs-scrollButtons": {
                    color: theme.palette.text.primary,
                  },
                }}
                TabIndicatorProps={{ style: { backgroundColor: theme.palette.primary.main } }}
              >
                <Tab label="Posts" />
                {currentUser?._id === user._id && (
                  <Tab label="Bookmarks" icon={isSmallScreen ? <Bookmark fontSize="small" /> : null} />
                )}
                <Tab label="Followers" />
                <Tab label="Following" />
                {currentUser?._id === user._id && (
                  <Tab label="Dashboard" icon={isSmallScreen ? <Dashboard fontSize="small" /> : null} />
                )}
              </Tabs>
            </Box>

            {/* Tab Content */}
            <Box sx={{ width: "100%", maxWidth: 600, mx: "auto" }}>
              {tabValue === 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {fetchingPosts ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                      <CircularProgress size={24} sx={{ color: theme.palette.primary.main }} />
                    </Box>
                  ) : postsState.posts.length === 0 ? (
                    <Card
                      sx={{
                        p: 3,
                        bgcolor: theme.palette.background.paper,
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        textAlign: "center",
                      }}
                    >
                      <Typography variant="body1" color={theme.palette.text.primary}>
                        No posts yet
                      </Typography>
                    </Card>
                  ) : (
                    postsState.posts.map((post) => (
                      <Post
                        key={post._id}
                        post={post}
                        postedBy={post.postedBy}
                        isAdminView={currentUser?.isAdmin}
                      />
                    ))
                  )}
                </Box>
              )}

              {tabValue === 1 && currentUser?._id === user._id && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {fetchingBookmarks ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                      <CircularProgress size={24} sx={{ color: theme.palette.primary.main }} />
                    </Box>
                  ) : (postsState.bookmarks || []).length === 0 ? (
                    <Card
                      sx={{
                        p: 3,
                        bgcolor: theme.palette.background.paper,
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        textAlign: "center",
                      }}
                    >
                      <Typography variant="body1" color={theme.palette.text.primary}>
                        No bookmarked posts yet
                      </Typography>
                    </Card>
                  ) : (
                    (postsState.bookmarks || []).map((post) => (
                      <Post
                        key={post._id}
                        post={post}
                        postedBy={post.postedBy}
                        isAdminView={currentUser?.isAdmin}
                      />
                    ))
                  )}
                </Box>
              )}

              {tabValue === (currentUser?._id === user._id ? 2 : 1) && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {user.followers?.length === 0 ? (
                    <Card
                      sx={{
                        p: 3,
                        bgcolor: theme.palette.background.paper,
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        textAlign: "center",
                      }}
                    >
                      <Typography variant="body1" color={theme.palette.text.primary}>
                        No followers yet
                      </Typography>
                    </Card>
                  ) : (
                    user.followers.map((followerId) => (
                      <FollowerCard key={followerId} followerId={followerId} navigate={navigate} />
                    ))
                  )}
                </Box>
              )}

              {tabValue === (currentUser?._id === user._id ? 3 : 2) && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {user.following?.length === 0 ? (
                    <Card
                      sx={{
                        p: 3,
                        bgcolor: theme.palette.background.paper,
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        textAlign: "center",
                      }}
                    >
                      <Typography variant="body1" color={theme.palette.text.primary}>
                        Not following anyone yet
                      </Typography>
                    </Card>
                  ) : (
                    user.following.map((followingId) => (
                      <FollowingCard key={followingId} followingId={followingId} navigate={navigate} />
                    ))
                  )}
                </Box>
              )}

              {tabValue === 4 && currentUser?._id === user._id && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontWeight: 600 }}>
                    Your Activity Dashboard
                  </Typography>

                  <Card sx={{ p: 2, borderRadius: "12px", bgcolor: theme.palette.background.paper }}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                      Engagement Overview
                    </Typography>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={isSmallScreen ? 70 : 80}
                          label
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            borderRadius: 8,
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            color: theme.palette.text.primary,
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card sx={{ p: 2, borderRadius: "12px", bgcolor: theme.palette.background.paper }}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                      Activity Trend
                    </Typography>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={lineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
                        <XAxis dataKey="month" stroke={theme.palette.text.secondary} />
                        <YAxis stroke={theme.palette.text.secondary} />
                        <ChartTooltip
                          contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            borderRadius: 8,
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            color: theme.palette.text.primary,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="likes"
                          stroke={COLORS[0]}
                          strokeWidth={2}
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="posts"
                          stroke={COLORS[1]}
                          strokeWidth={2}
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="comments"
                          stroke={COLORS[2]}
                          strokeWidth={2}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card sx={{ p: 2, borderRadius: "12px", bgcolor: theme.palette.background.paper }}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                      Activity Breakdown
                    </Typography>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
                        <XAxis dataKey="month" stroke={theme.palette.text.secondary} />
                        <YAxis stroke={theme.palette.text.secondary} />
                        <ChartTooltip
                          contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            borderRadius: 8,
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            color: theme.palette.text.primary,
                          }}
                        />
                        <Bar dataKey="likes" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="posts" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="comments" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Box>
              )}
            </Box>
          </Box>
        </motion.div>
      </App>
    </ConfigProvider>
  );
};

const FollowerCard = ({ followerId, navigate }) => {
  const [follower, setFollower] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const currentUser = useRecoilValue(userAtom);
  const { handleFollowUnfollow, updating, following } = useFollowUnfollow(follower);

  useEffect(() => {
    const fetchFollower = async () => {
      try {
        const res = await fetch(`/api/users/profile/${followerId}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (res.ok) {
          setFollower(data);
        } else {
          throw new Error(data.error || "Failed to fetch follower");
        }
      } catch (error) {
        console.error("Error fetching follower:", error.stack);
        message.error(error.message || "Failed to load follower");
      } finally {
        setLoading(false);
      }
    };
    fetchFollower();
  }, [followerId]);

  if (loading) {
    return (
      <Card sx={{ p: 2, bgcolor: theme.palette.background.paper, borderRadius: "12px" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <CircularProgress size={24} sx={{ color: theme.palette.primary.main }} />
        </Box>
      </Card>
    );
  }

  if (!follower) return null;

  return (
    <Card
      sx={{
        p: 2,
        bgcolor: theme.palette.background.paper,
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        "&:hover": { boxShadow: "0 4px 12px rgba(133, 21, 254, 0.2)" },
        transition: "box-shadow 0.3s",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar
          src={follower.profilePic}
          sx={{
            width: 48,
            height: 48,
            cursor: "pointer",
            border: follower.isBanned
              ? "2px solid #f44336"
              : follower.isVerified
              ? "2px solid #8515fe"
              : "2px solid rgba(255, 255, 255, 0.2)",
          }}
          onClick={() => navigate(`/${follower.username}`)}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
              onClick={() => navigate(`/${follower.username}`)}
            >
              {follower.username}
            </Typography>
            {follower.isVerified && (
              <Tooltip title="Verified">
                <VerifiedIcon color="primary" fontSize="small" />
              </Tooltip>
            )}
          </Box>
          {follower.isBanned && (
            <Chip
              label="Banned"
              size="small"
              color="error"
              sx={{ ml: 1, fontSize: "0.6rem", height: 20 }}
            />
          )}
        </Box>
        {currentUser?._id !== follower._id && (
          <Button
            variant={following ? "outlined" : "contained"}
            size="small"
            onClick={handleFollowUnfollow}
            disabled={updating || follower.isBanned}
            sx={{
              borderRadius: 20,
              textTransform: "none",
              bgcolor: following ? "transparent" : theme.palette.primary.main,
              color: following ? theme.palette.primary.main : theme.palette.text.primary,
              borderColor: following ? theme.palette.primary.main : "transparent",
              minWidth: 100,
              "&:hover": { bgcolor: following ? "rgba(133, 21, 254, 0.1)" : "#6b12cb" },
            }}
          >
            {following ? "Following" : "Follow"}
          </Button>
        )}
      </Box>
    </Card>
  );
};

const FollowingCard = ({ followingId, navigate }) => {
  const [followingUser, setFollowingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const currentUser = useRecoilValue(userAtom);
  const { handleFollowUnfollow, updating, following } = useFollowUnfollow(followingUser);

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const res = await fetch(`/api/users/profile/${followingId}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (res.ok) {
          setFollowingUser(data);
        } else {
          throw new Error(data.error || "Failed to fetch following user");
        }
      } catch (error) {
        console.error("Error fetching following user:", error.stack);
        message.error(error.message || "Failed to load following user");
      } finally {
        setLoading(false);
      }
    };
    fetchFollowing();
  }, [followingId]);

  if (loading) {
    return (
      <Card sx={{ p: 2, bgcolor: theme.palette.background.paper, borderRadius: "12px" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <CircularProgress size={24} sx={{ color: theme.palette.primary.main }} />
        </Box>
      </Card>
    );
  }

  if (!followingUser) return null;

  return (
    <Card
      sx={{
        p: 2,
        bgcolor: theme.palette.background.paper,
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        "&:hover": { boxShadow: "0 4px 12px rgba(133, 21, 254, 0.2)" },
        transition: "box-shadow 0.3s",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar
          src={followingUser.profilePic}
          sx={{
            width: 48,
            height: 48,
            cursor: "pointer",
            border: followingUser.isBanned
              ? "2px solid #f44336"
              : followingUser.isVerified
              ? "2px solid #8515fe"
              : "2px solid rgba(255, 255, 255, 0.2)",
          }}
          onClick={() => navigate(`/${followingUser.username}`)}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
              onClick={() => navigate(`/${followingUser.username}`)}
            >
              {followingUser.username}
            </Typography>
            {followingUser.isVerified && (
              <Tooltip title="Verified">
                <VerifiedIcon color="primary" fontSize="small" />
              </Tooltip>
            )}
          </Box>
          {followingUser.isBanned && (
            <Chip
              label="Banned"
              size="small"
              color="error"
              sx={{ ml: 1, fontSize: "0.6rem", height: 20 }}
            />
          )}
        </Box>
        {currentUser?._id !== followingUser._id && (
          <Button
            variant={following ? "outlined" : "contained"}
            size="small"
            onClick={handleFollowUnfollow}
            disabled={updating || followingUser.isBanned}
            sx={{
              borderRadius: 20,
              textTransform: "none",
              bgcolor: following ? "transparent" : theme.palette.primary.main,
              color: following ? theme.palette.primary.main : theme.palette.text.primary,
              borderColor: following ? theme.palette.primary.main : "transparent",
              minWidth: 100,
              "&:hover": { bgcolor: following ? "rgba(133, 21, 254, 0.1)" : "#6b12cb" },
            }}
          >
            {following ? "Following" : "Follow"}
          </Button>
        )}
      </Box>
    </Card>
  );
};

export default UserPage;