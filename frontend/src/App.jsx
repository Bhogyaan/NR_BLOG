import { useState, lazy, Suspense, useTransition, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Modal,
  useMediaQuery,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from "@mui/material";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import userAtom from "./atoms/userAtom";
import { SocketContextProvider } from "./context/SocketContext";
import { Skeleton } from "antd";
import TopNav from "./components/TopNav";
import BottomNavigation from "./components/BottomNav";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";

// Improved lazy loading with error boundaries
const lazyWithRetry = (componentImport) => {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Component load error:", error);
      throw error;
    }
  });
};

// Lazy-loaded pages with retry
const UserPage = lazyWithRetry(() => import("./pages/UserPage"));
const PostPage = lazyWithRetry(() => import("./pages/PostPage"));
const HomePage = lazyWithRetry(() => import("./pages/HomePage"));
const AuthPage = lazyWithRetry(() => import("./pages/AuthPage"));
const UpdateProfilePage = lazyWithRetry(() => import("./pages/UpdateProfilePage"));
const CreatePost = lazyWithRetry(() => import("./components/CreatePost"));
const ChatPage = lazyWithRetry(() => import("./pages/ChatPage"));
const SettingsPage = lazyWithRetry(() => import("./pages/SettingsPage"));
const DashboardPage = lazyWithRetry(() => import("./pages/DashboardPage"));
const SearchPage = lazyWithRetry(() => import("./pages/SearchPage"));
const EditProfile = lazyWithRetry(() => import("./components/EditProfile"));
const EditPostPage = lazyWithRetry(() => import("./pages/EditPostPage"));
const AdminProfilePage = lazyWithRetry(() => import("./pages/AdminProfilePage"));
const NotFoundPage = lazyWithRetry(() => import("./pages/NotFoundPage"));

// Base theme configuration with glassmorphism support
const getDesignTokens = (mode, glassIntensity = 10, highContrastText = false) => ({
  palette: {
    mode,
    primary: { main: mode === "dark" ? "#8515fc" : "#6200ea" },
    secondary: { main: mode === "dark" ? "#8b5cf6" : "#7c4dff" },
    background: {
      default: mode === "dark" ? "#1a1a1a" : "#f5f5f5",
      paper: mode === "dark" ? "rgba(30, 30, 30, 0.5)" : "rgba(255, 255, 255, 0.7)",
    },
    text: {
      primary: highContrastText
        ? mode === "dark" ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 0, 0, 0.95)"
        : mode === "dark" ? "#ffffff" : "#121212",
      secondary: mode === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: "16px",
          border: mode === "dark" ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.1)",
          background: mode === "dark"
            ? "linear-gradient(135deg, rgba(133, 21, 252, 0.1), rgba(30, 30, 30, 0.5))"
            : "linear-gradient(135deg, rgba(98, 0, 234, 0.1), rgba(255, 255, 255, 0.7))",
          backdropFilter: `blur(${glassIntensity}px)`,
          boxShadow: mode === "dark"
            ? "0 8px 32px rgba(0, 0, 0, 0.3)"
            : "0 8px 32px rgba(0, 0, 0, 0.1)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          background: mode === "dark"
            ? "linear-gradient(45deg, #8515fc, #8b5cf6)"
            : "linear-gradient(45deg, #6200ea, #7c4dff)",
          color: "white",
          "&:hover": {
            boxShadow: mode === "dark"
              ? "0 4px 20px rgba(133, 21, 252, 0.3)"
              : "0 4px 20px rgba(98, 0, 234, 0.2)",
          },
        }
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backdropFilter: `blur(${glassIntensity / 2}px)`,
        },
      },
    },
  },
});

// Custom toast icons
const toastIcons = {
  success: <FaCheckCircle />,
  info: <FaInfoCircle />,
  warning: <FaExclamationTriangle />,
  error: <FaTimesCircle />,
};

// Custom toast function
export const showToast = (type, message, theme = "colored") => {
  toast[type](message, {
    position: "top-center",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme,
    icon: toastIcons[type],
  });
};

// Protected Route Component
const ProtectedRoute = ({ element, requireAdmin = false }) => {
  const user = useRecoilValue(userAtom);

  if (!user) {
    showToast("error", "Please log in to access this page.");
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && !user.isAdmin) {
    showToast("error", "Admin access required.");
    return <Navigate to="/" replace />;
  }

  return element;
};

function App() {
  const user = useRecoilValue(userAtom);
  const setUser = useSetRecoilState(userAtom);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery("(max-width:501px)");
  const isMediumScreenOrLarger = useMediaQuery("(min-width:501px)");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Theme settings state
  const [themeSettings, setThemeSettings] = useState(() => {
    const savedSettings = localStorage.getItem("themeSettings");
    return savedSettings
      ? JSON.parse(savedSettings)
      : {
          darkMode: "dark", // Ensure this is a string
          glassIntensity: 10,
          highContrastText: false
        };
  });

  // Update theme settings in localStorage
  useEffect(() => {
    localStorage.setItem("themeSettings", JSON.stringify(themeSettings));
    document.documentElement.style.setProperty("--glass-intensity", `${themeSettings.glassIntensity}px`);
  }, [themeSettings]);

  // Create theme with current settings
  const theme = useMemo(() =>
    createTheme(getDesignTokens(
      themeSettings.darkMode, // This should be "light" or "dark"
      themeSettings.glassIntensity,
      themeSettings.highContrastText
    )),
    [themeSettings]
  );

  // Initialize user on app load
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const res = await fetch("/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          });
          const data = await res.json();
          if (data.error) {
            console.error("Failed to fetch user:", data.error);
            localStorage.removeItem("token");
            showToast("error", "Session expired. Please log in again.");
            navigate("/auth");
            return;
          }
          setUser(data);
        }
      } catch (error) {
        console.error("Error initializing user:", error.message);
        localStorage.removeItem("token");
        showToast("error", "Failed to authenticate. Please log in.");
        navigate("/auth");
      }
    };

    if (!user) {
      initializeUser();
    }
  }, [setUser, navigate, user]);

  const handleOpen = () => {
    startTransition(() => {
      setIsOpen(true);
    });
  };

  const handleClose = () => {
    startTransition(() => {
      setIsOpen(false);
    });
  };

  const updateThemeSettings = (newSettings) => {
    setThemeSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  const bottomPadding = isSmallScreen ? "70px" : "0";
  const topNavHeight = 64;
  const topPadding = isMediumScreenOrLarger ? `${topNavHeight}px` : "0";

  const LoadingSkeleton = () => (
    <Box sx={{ p: 4 }}>
      <Skeleton active paragraph={{ rows: 5 }} />
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SocketContextProvider>
        <ErrorBoundary>
          <Box
            position="relative"
            width="100%"
            minHeight="100vh"
            paddingBottom={bottomPadding}
            bgcolor="background.default"
            color="text.primary"
            sx={{
              background: themeSettings.darkMode === "dark"
                ? "radial-gradient(circle at top left, #1a1a1a, #121212)"
                : "radial-gradient(circle at top left, #f5f5f5, #e0e0e0)",
              transition: "background 0.3s ease",
            }}
          >
            <ToastContainer
              position="top-center"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme={themeSettings.darkMode === "dark" ? "dark" : "light"}
              style={{
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              }}
            />
            {isMediumScreenOrLarger && pathname !== "/auth" && user && (
              <TopNav
                user={user}
                darkMode={themeSettings.darkMode === "dark"}
                setDarkMode={(mode) => updateThemeSettings({ darkMode: mode ? "dark" : "light" })}
                sx={{ position: "fixed", top: 0, zIndex: 1200, width: "100%" }}
              />
            )}
            <Container
              maxWidth={pathname === "/" ? { xs: "xs", md: "md" } : { xs: "xs", md: "sm" }}
              sx={{
                px: { xs: 2, md: 4 },
                py: 4,
                pt: topPadding,
              }}
            >
              <Suspense fallback={<LoadingSkeleton />}>
                <Routes>
                  <Route path="/" element={<ProtectedRoute element={<HomePage />} />} />
                  <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" replace />} />
                  <Route path="/update" element={<ProtectedRoute element={<UpdateProfilePage />} />} />
                  <Route
                    path="/create-post"
                    element={
                      <ProtectedRoute
                        element={
                          <Modal
                            open={true}
                            onClose={() => navigate("/")}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Box
                              sx={{
                                bgcolor: "background.paper",
                                boxShadow: 24,
                                p: 4,
                                borderRadius: "16px",
                                width: { xs: "90%", md: "600px" },
                                maxHeight: "80vh",
                                overflowY: "auto",
                              }}
                            >
                              <CreatePost
                                isOpen={true}
                                onClose={() => navigate("/")}
                                onPostCreated={() => navigate("/")}
                              />
                            </Box>
                          </Modal>
                        }
                      />
                    }
                  />
                  <Route path="/edit-post/:id" element={<ProtectedRoute element={<EditPostPage />} />} />
                  <Route path="/:username" element={<ProtectedRoute element={<UserPage />} />} />
                  <Route path="/admin/:username" element={<ProtectedRoute element={<AdminProfilePage />} requireAdmin />} />
                  <Route path="/edit-profile" element={<ProtectedRoute element={<EditProfile />} />} />
                  <Route path="/:username/post/:pid" element={<ProtectedRoute element={<PostPage />} />} />
                  <Route path="/chat" element={<ProtectedRoute element={<ChatPage />} />} />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute
                        element={
                          <SettingsPage
                            themeSettings={themeSettings}
                            updateThemeSettings={updateThemeSettings}
                          />
                        }
                      />
                    }
                  />
                  <Route path="/dashboard" element={<ProtectedRoute element={<DashboardPage />} />} />
                  <Route path="/search" element={<ProtectedRoute element={<SearchPage />} />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </Container>

            {isOpen && (
              <Modal
                open={isOpen}
                onClose={handleClose}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    bgcolor: "background.paper",
                    boxShadow: 24,
                    p: 4,
                    borderRadius: "16px",
                    width: { xs: "90%", md: "600px" },
                    maxHeight: "80vh",
                    overflowY: "auto",
                  }}
                >
                  <Suspense fallback={<LoadingSkeleton />}>
                    <CreatePost
                      isOpen={isOpen}
                      onClose={handleClose}
                      onPostCreated={handleClose}
                    />
                  </Suspense>
                </Box>
              </Modal>
            )}

            {isSmallScreen && pathname !== "/auth" && user && (
              <BottomNavigation onOpenCreatePost={handleOpen} />
            )}
          </Box>
        </ErrorBoundary>
      </SocketContextProvider>
    </ThemeProvider>
  );
}

export default App;
