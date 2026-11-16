import api from "../../services/api";

// FETCH ALL PROCESS
export const getAllProcess = async () => {
  const { data } = await api.get("/api/process/fetchAllProcess");
  return data;
};

// CREATE NEW PROCESS
export const createNewProcess = async (payload) => {
  const { data } = await api.post("/api/process/addNewProcess", payload);
  return data;
};

// UPDATE PROCESS  ✅ NEW FUNCTION
export const updateProcess = async (payload) => {

  const { data } = await api.post(
    "/api/process/updateProcess",
    payload
  );
  return data;
};
