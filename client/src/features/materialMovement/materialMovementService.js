import api from "../../services/api";

export const createMaterialMovementRequest = async (payload) => {
  const { data } = await api.post("/api/movement/addNewMovement", payload);
  return data;
};

export const getAllMaterialMovement = async () => {
  const { data } = await api.get("/api/movement/getAllMovements");
  return data;
};

export const getMaterialMovementOverTime = async (code, from_location, to_location) => {

  const { data } = await api.get(
    "/api/movement/getMaterialMovemntOverTimeThroughLocations",
    {
      params: { code, from_location, to_location },
    }
  );
  return data;
};

export const getMaterialPresenceAtLocationToday = async (code) => {
  try {
    const { data } = await api.get(
      `/api/movement/getMaterialPresenceAtLocationToday`,
      {
        params: { code },
      }
    );
    return data;
  } catch (error) {
    console.error("Error fetching material presence:", error);
    throw error;
  }
};

export const getAverageOfMovementTimePerRoute = async (code) => {
  try {
    const { data } = await api.get(
      `/api/movement/getAverageOfMovementTimePerRoute`,
      {
        params: { code },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching avg movement time:", error);
    throw error;
  }
};

export const getAverageOfAllMovementTime = async (code) => {
  try {
    const { data } = await api.get(
      `/api/movement/getAverageOfAllMovementTime`,
      {
        params: { code },
      }
    );

    return data;
  } catch (error) {
    console.error("Error fetching avg of all movement time:", error);
    throw error;
  }
};

export const getAllMaterialPresenceAtLocationSpecificDate = async (
  date
) => {
  try {
    const { data } = await api.get(
      `/api/movement/getAllMaterialPresenceAtLocationSpecificDate`,
      {
        params: { date },
      }
    );
    return data;
  } catch (error) {
    console.error("Error fetching material presence at location specific date:", error);
    throw error;
  }
};

export const getAllCurrentMaterialPresenceAtAllLocations = async () => {
  try {
    const { data } = await api.get(
      `/api/movement/getAllCurrentMaterialPresenceAtAllLocations`
    );
    return data;
  } catch (error) {
    console.error("Error fetching material presence:", error);
    throw error;
  }
};

export const getMaterialRoutingHistoryTillDate = async (code) => {
  try {
    const { data } = await api.get(
      `/api/movement/getMaterialRoutingHistoryTillDate`,
      {
        params: { code },
      }
    );
    return data;
  } catch (error) {
    console.error("Error fetching material routing history:", error);
    throw error;
  }
};

export const getOccupancyDistribution = async () => {
  try {
    const { data } = await api.get(
      `/api/movement/getOccupancyDistribution`
    );
    return data;
  } catch (error) {
    console.error("Error fetching occupancy distribution:", error);
    throw error;
  }
};

export const getMaterialPresenceFromToDate = async (fromDate,toDate) => {
  try {
    const { data } = await api.get(
      `/api/movement/getMaterialPresenceFromToDate`,
      {
        params: { fromDate,toDate },
      }
    );
    return data;
  } catch (error) {
    console.error("Error fetching material routing history:", error);
    throw error;
  }
};