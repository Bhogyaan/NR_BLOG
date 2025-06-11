import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { message } from "antd";
import { useSearchParams } from "react-router-dom";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import Post from "../components/Post";

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const user = useRecoilValue(userAtom);

  // Trigger search from query parameter on mount
  useEffect(() => {
    const query = searchParams.get("q");
    if (query && user) {
      setSearchQuery(query);
      handleSearch(query);
    }
  }, [searchParams, user]);

  const handleSearch = async (query = searchQuery) => {
    if (!user) {
      message.error("Please log in to search posts");
      setSearchResults([]);
      return;
    }

    if (!query.trim()) {
      message.error("Please enter a username to search");
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/posts/user/${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (res.status === 403) {
          throw new Error("Cannot view posts from a banned user");
        } else if (res.status === 404) {
          throw new Error(`User "${query}" not found or no posts available`);
        }
        throw new Error(data.error || "Failed to fetch posts");
      }
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(error.message || "An unexpected error occurred");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom textAlign="center">
          Search Posts by User
        </Typography>

        {!user && (
          <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
            Please log in to search posts.
          </Typography>
        )}

        {user && (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              mb: 4,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <TextField
              fullWidth
              label="Search by username"
              placeholder="Enter username to search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              aria-label="Search posts by username"
            />
            <Button
              variant="contained"
              onClick={() => handleSearch()}
              disabled={loading}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {loading ? <CircularProgress size={24} /> : "Search"}
            </Button>
          </Box>
        )}

        {loading && (
          <Box sx={{ textAlign: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && searchQuery && searchResults.length === 0 && user && (
          <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ my: 4 }}>
            No posts found for "{searchQuery}"
          </Typography>
        )}

        {!loading && searchResults.length > 0 && (
          <Grid container spacing={2}>
            {searchResults.map((post) => (
              <Grid item xs={12} key={post._id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Post post={post} postedBy={post.postedBy} />
                </motion.div>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </motion.div>
  );
};

export default SearchPage;