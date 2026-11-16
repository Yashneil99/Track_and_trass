import api from "../../services/api";

export const createNewLocation = async (payload) => {
  const { data } = await api.post("/api/location/addNewLocation", payload);
  return data;
};
export const getAllLocation = async () => {
  const { data } = await api.get("/api/location/getAllLocations");
  return data;
};
export const createBulkLocations = async (payload) => {
  const { data } = await api.post("/api/location/addBulkLocations", payload);
  return data;
};
export const getLocationTree = async () => {
  const { data } = await api.get("/api/location/tree");
  return data;
};
export const deleteLocationTree = async (locationId) => {
  const { data } = await api.delete("/api/location/deleteLocationTree", {
    params: { locationId },
  });
  return data;
};
// Used by the STN manual-assign picker to show remaining space per bin
// (remaining_capacity already accounts for reserved STN allocations).
export const getAvailableBins = async () => {
  const { data } = await api.get(
    "/api/location/binLocationsWithOccupancyAvailability",
  );
  return data;
};
