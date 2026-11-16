import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers } from "../../features/users/userSlice";
import {
  Container,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Alert,
  Box,
  Divider,
  Button,
} from "@mui/material";

const UsersList = () => {
  const dispatch = useDispatch();

  // Redux states
  const { list: users, status, error } = useSelector((state) => state.users);
  const user = useSelector((state) => state.auth.user);

  // Fetch users on mount

  useEffect(() => {
    if (user) dispatch(fetchUsers());
  }, [dispatch, user]);

  const handleRefresh = async() => {
   const res = await dispatch(fetchUsers());
     if (res.meta.requestStatus === "fulfilled") {
        
     }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Paper elevation={4} sx={{ p: 3, borderRadius: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="600">
            Users
          </Typography>
          <Button variant="outlined" onClick={handleRefresh}>
            Refresh
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {status === "loading" && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {status === "failed" && <Alert severity="error">{error}</Alert>}

        {status === "succeeded" && users.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No users found.
          </Typography>
        )}

        {status === "succeeded" && users.length > 0 && (
          <List>
            {users.map((user) => (
              <ListItem key={user.id} divider>
                <ListItemText
                  primary={user.userName || user.name}
                  secondary={user.email}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default UsersList;
