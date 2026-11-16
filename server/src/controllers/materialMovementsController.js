const {
  addNewMaterialMovement,
  getAllMaterialMovements,
  getMaterialMovemntOverTimeThroughLocations,
  getMaterialPresenceAtLocationToday,
  getAverageOfAllMovementTime,
  getAverageOfMovementTimePerRoute,
  getAllMaterialPresenceAtLocationSpecificDate,
  getMaterialRoutingHistoryTillDate,
  getAllCurrentMaterialPresenceAtAllLocations,
  addNewBulkMaterialMovement,
  completeMaterialMovement,
  reassignInTransitBin,
  occupancyMaterialDistribution,
  inTransitMaterialMovements,
  movedtMaterialMovements,
  outwardIntransitMovements,
  materialPresenceFromToDate,
  materialCurrentLocation,
} = require("../dataLayer/materialMovementsDL");

const addNewMovement = async (req, res) => {
  try {
    const { location, quantity, material, status, purpose, moved_by } =
      req.body;

    const result = await addNewMaterialMovement(
      location,
      quantity,
      material,
      status,
      purpose,
      moved_by,
    );
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Add New Movement Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const insertBulkMovements = async (req, res) => {
  try {
    const movements = req.body;
    if (!Array.isArray(movements) || movements.length === 0) {
      return res.status(400).json({ message: "Movements array is required" });
    }

    const isValid = movements.every(
      (m) =>
        // m.location &&
        m.quantity && m.material && m.status && m.purpose && m.moved_by,
    );

    if (!isValid) {
      return res
        .status(400)
        .json({ message: "One or more movements are missing required fields" });
    }

    const result = await addNewBulkMaterialMovement(movements);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Bulk Insert Movements Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const completeMovement = async (req, res) => {
  try {
    const movement = req.body;

    if (!movement || typeof movement !== "object" || Array.isArray(movement)) {
      return res.status(400).json({
        status: 400,
        message: "Invalid payload: Expected an object format.",
      });
    }

    const { material, location } = movement;

    if (!location || typeof location !== "string" || !location.trim()) {
      return res.status(400).json({
        status: 400,
        message: "Validation Error: 'location' string is required.",
      });
    }

    if (!Array.isArray(material) || material.length === 0) {
      return res.status(400).json({
        status: 400,
        message:
          "Validation Error: 'material' must be a non-empty array of strings.",
      });
    }

    const materialsAreStrings = material.every(
      (mat) => typeof mat === "string" && mat.trim() !== "",
    );
    if (!materialsAreStrings) {
      return res.status(400).json({
        status: 400,
        message:
          "Validation Error: All items inside 'material' array must be valid strings.",
      });
    }

    const result = await completeMaterialMovement(movement);

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Complete In Transit Movement Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Task 3B — override the assigned bin for a group of scanned in-transit bags.
// The bags stay 'In Transit'; only their location moves, so the operator can
// carry them to the new bin and run a normal putaway there later.
// Reassignment is all-or-nothing.
const changeAssignedBin = async (req, res) => {
  try {
    const { bag_ids, old_bin, new_bin, operator_id } = req.body || {};

    if (!old_bin || typeof old_bin !== "string" || !old_bin.trim() ||
        !new_bin || typeof new_bin !== "string" || !new_bin.trim()) {
      return res.status(400).json({
        status: 400,
        message: "Validation Error: 'old_bin' and 'new_bin' are required.",
      });
    }

    if (old_bin.trim() === new_bin.trim()) {
      return res.status(400).json({
        status: 400,
        message: "Validation Error: 'new_bin' must differ from 'old_bin'.",
      });
    }

    if (!Array.isArray(bag_ids) || bag_ids.length === 0 ||
        !bag_ids.every((b) => typeof b === "string" && b.trim() !== "")) {
      return res.status(400).json({
        status: 400,
        message:
          "Validation Error: 'bag_ids' must be a non-empty array of strings.",
      });
    }

    const result = await reassignInTransitBin({
      bag_ids,
      old_bin,
      new_bin,
      operator_id,
    });
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Change Assigned Bin Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchAllMovements = async (req, res) => {
  try {
    const result = await getAllMaterialMovements();
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch All Movements Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchMaterialMovemntOverTimeThroughLocations = async (req, res) => {
  try {
    const { code, from_location, to_location } = req.query;
    const result = await getMaterialMovemntOverTimeThroughLocations(
      code,
      from_location,
      to_location,
    );
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Movements Over Time Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchMaterialPresenceAtLocationToday = async (req, res) => {
  try {
    const { code } = req.query;
    const result = await getMaterialPresenceAtLocationToday(code);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Material Presence Today Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchAllMaterialPresenceAtLocationSpecificDate = async (req, res) => {
  try {
    const { date } = req.query;
    const result = await getAllMaterialPresenceAtLocationSpecificDate(date);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Material Presence Specific Date Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchAverageOfAllMovementTime = async (req, res) => {
  try {
    const { code } = req.query;
    const result = await getAverageOfAllMovementTime(code);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Material Average Time:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchAverageOfMovementTimePerRoute = async (req, res) => {
  try {
    const { code } = req.query;
    const result = await getAverageOfMovementTimePerRoute(code);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Material Average Time:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchMaterialRoutingHistoryTillDate = async (req, res) => {
  try {
    const { code } = req.query;
    const result = await getMaterialRoutingHistoryTillDate(code);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Material Routing History:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchAllCurrentMaterialPresenceAtAllLocations = async (req, res) => {
  try {
    const result = await getAllCurrentMaterialPresenceAtAllLocations();
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Current Material Presence : ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const occupancyDistribution = async (req, res) => {
  try {
    const result = await occupancyMaterialDistribution();
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Occupancy Distribution Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchIntransitMovements = async (req, res) => {
  try {
    const { location } = req.query;
    const result = await inTransitMaterialMovements(location);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Intransit Movements Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchMovedMaterialMovements = async (req, res) => {
  try {
    const { location } = req.query;
    const result = await movedtMaterialMovements(location);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Moved Material Movements Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchOutwardIntransitMovements = async (req, res) => {
  try {
    const result = await outwardIntransitMovements();
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Outward-Intransit Movements Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchMaterialPresenceFromToDate = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const result = await materialPresenceFromToDate(fromDate, toDate);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Moved Material Presence From To Date:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchMaterialCurrentLocation = async (req, res) => {
  try {
    const { materials } = req.body;
    const result = await materialCurrentLocation(materials);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Moved Material Presence From To Date:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addNewMovement,
  fetchAllMovements,
  fetchMaterialMovemntOverTimeThroughLocations,
  fetchMaterialPresenceAtLocationToday,
  fetchAverageOfAllMovementTime,
  fetchAverageOfMovementTimePerRoute,
  fetchAllMaterialPresenceAtLocationSpecificDate,
  fetchMaterialRoutingHistoryTillDate,
  fetchAllCurrentMaterialPresenceAtAllLocations,
  insertBulkMovements,
  completeMovement,
  changeAssignedBin,
  occupancyDistribution,
  fetchIntransitMovements,
  fetchMovedMaterialMovements,
  fetchOutwardIntransitMovements,
  fetchMaterialPresenceFromToDate,
  fetchMaterialCurrentLocation
};
