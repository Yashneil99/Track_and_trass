import api from "../../services/api";

export const loginRequest = async (email, password) => {
  const { data } = await api.post("/api/login", { email, password },  { withCredentials: true });
  return data;
};

export const registerRequest = async (payload) => {
  const { data } = await api.post("/api/register", payload);
  return data;
};

export const refreshRequest = async () => {
  // Refresh token is now sent automatically via HttpOnly cookie
  const { data } = await api.post("/api/refresh",{},{ withCredentials: true });
  return data;
};
