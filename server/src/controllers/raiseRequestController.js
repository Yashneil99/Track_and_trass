const {
  raiseNewRequest,
  updateRaiseRequest,
  deleteRaiseRequest,
  getPendingRaiseRequests,
  applyOutward,
} = require("../dataLayer/raiseRequestDL");

const raiseOutwardRequest = (io) => async (req, res) => {
  try {
    const { location, no_of_bags, available_bags,materials } = req.body;

    // Validation fix: Ensure you are checking if fields are missing correctly
    if (!location || !no_of_bags || !materials) {
      return res
        .status(400)
        .json({ message: "Location, no_of_bags, and materials are required" });
    }

    const result = await raiseNewRequest(location, no_of_bags, available_bags, materials);

    // Broadcast to all connected WebSocket clients
    if (result.status === 201) {
      io.emit("new-request-broadcast", result.data);
    }

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Raise Request Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateRequest = async (req, res) => {
  try {
    const { status, raise_id } = req.body;

    if (!status || !raise_id) {
      return res
        .status(400)
        .json({ message: "Status and raise_id are required" });
    }

    const result = await updateRaiseRequest(status, raise_id);

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Update Raise Request Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteRequest = (io) => async (req, res) => {
  try {
    const { raise_id } = req.body;

    if (!raise_id) {
      return res.status(400).json({ message: "raise_id is required" });
    }

    const result = await deleteRaiseRequest(raise_id);

    // Broadcast the removal so every connected client drops it from their list.
    if (result.status === 200) {
      io.emit("request-deleted", { raise_id });
    }

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Delete Raise Request Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchLatestPendingRequests = async (req, res) => {
  try {
    const result = await getPendingRaiseRequests();
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Update Raise Request Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Apply an outward submission (supports partial). Body:
//   { raise_id, outwarded: [{ garden, garden_inv_no, grade, count }, ...] }
// Decrements the remaining bags; keeps the request PENDING with the reduced
// counts until it is fully picked, then COMPLETED.
const applyOutwardRequest = (io) => async (req, res) => {
  try {
    const { raise_id, outwarded } = req.body;

    if (!raise_id) {
      return res.status(400).json({ message: "raise_id is required" });
    }

    const result = await applyOutward(raise_id, outwarded || []);

    // Let connected clients refresh their pending list.
    if (result.status === 200) {
      io.emit("request-updated", {
        raise_id,
        completed: result.completed,
        data: result.data,
      });
    }

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Apply Outward Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  raiseOutwardRequest,
  updateRequest,
  deleteRequest,
  fetchLatestPendingRequests,
  applyOutwardRequest,
};
