import api from "../../services/api";

// ✅ Fetch all users
export const getAllUsers = async () => {
  const { data } = await api.get("/api/users");
  return data;
};

export const updateUserStatus = async (id, payload) => {
  const { data } = await api.put(`/api/users/${id}`, payload);
  return data;
};
