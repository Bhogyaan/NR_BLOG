import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Switch,
  FormControlLabel,
  Paper,
  Divider,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Brightness4, Brightness7, Palette, Contrast } from "@mui/icons-material";

const SettingsPage = ({ themeSettings, updateThemeSettings }) => {
  const [user, setUser] = useRecoilState(userAtom);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const navigate = useNavigate();

  // Custom toast function for this component
  const showToast = (type, message) => {
    toast[type](message, {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: theme.palette.mode === "dark" ? "dark" : "light",
    });
  };

  const handleThemeToggle = () => {
    const newMode = themeSettings.darkMode === "dark" ? "light" : "dark";
    updateThemeSettings({ darkMode: newMode });
    showToast("success", `Switched to ${newMode} mode`);
  };

  const handleGlassIntensityChange = (value) => {
    updateThemeSettings({ glassIntensity: value });
  };

  const handleHighContrastTextToggle = () => {
    updateThemeSettings({ highContrastText: !themeSettings.highContrastText });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    showToast("success", "Logged out successfully");
    navigate("/auth");
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        py: 4,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Paper
        sx={{
          p: 3,
          borderRadius: 4,
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: `blur(${themeSettings.glassIntensity}px)`,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            background: "linear-gradient(45deg, #8515fc, #8b5cf6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            mb: 3,
          }}
        >
          Settings
        </Typography>

        {/* Theme Settings Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
            <Palette sx={{ mr: 1 }} /> Appearance
          </Typography>

          <Paper
            sx={{
              p: 2,
              mb: 2,
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={themeSettings.darkMode === "dark"}
                  onChange={handleThemeToggle}
                  color="secondary"
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {themeSettings.darkMode === "dark" ? (
                    <Brightness7 sx={{ mr: 1 }} />
                  ) : (
                    <Brightness4 sx={{ mr: 1 }} />
                  )}
                  {themeSettings.darkMode === "dark" ? "Dark Mode" : "Light Mode"}
                </Box>
              }
              sx={{ width: "100%" }}
            />
          </Paper>

          <Paper
            sx={{
              p: 2,
              mb: 2,
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <Typography variant="subtitle1" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
              <Contrast sx={{ mr: 1 }} /> Glass Effect Intensity
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="caption">Soft</Typography>
              <input
                type="range"
                min="0"
                max="20"
                value={themeSettings.glassIntensity}
                onChange={(e) => handleGlassIntensityChange(parseInt(e.target.value))}
                style={{ flexGrow: 1 }}
              />
              <Typography variant="caption">Strong</Typography>
            </Box>
          </Paper>

          <Paper
            sx={{
              p: 2,
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={themeSettings.highContrastText}
                  onChange={handleHighContrastTextToggle}
                  color="secondary"
                />
              }
              label="High Contrast Text"
              sx={{ width: "100%" }}
            />
            <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
              Improves text readability on glass backgrounds
            </Typography>
          </Paper>
        </Box>

        <Divider sx={{ my: 3, borderColor: "rgba(255, 255, 255, 0.1)" }} />

        {/* Account Settings Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Account
          </Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={handleLogout}
            fullWidth
            sx={{
              py: 1.5,
              borderRadius: 2,
              borderWidth: 2,
              "&:hover": { borderWidth: 2 },
            }}
          >
            Log Out
          </Button>
        </Box>

        {/* App Info Section */}
        <Box>
          <Typography variant="body2" color="text.secondary" align="center">
            App Version 1.0.0
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default SettingsPage;
