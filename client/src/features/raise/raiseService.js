import api from "../../services/api";

export const raiseNewOutwardRequest = async (payload) => {
  try {
    const { data } = await api.post("/api/raise/raiseOutwardRequest",payload);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch documents",
    );
  }
};

export const fetchPendingRaiseRequests = async () => {
  try {
    const { data } = await api.get("/api/raise/getPendingRaiseRequest");
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch pending requests",
    );
  }
};

export const deleteRaiseRequest = async (raiseId) => {
  try {
    const { data } = await api.post("/api/raise/deleteRaiseRequest", {
      raise_id: raiseId,
    });
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to delete request",
    );
  }
};



