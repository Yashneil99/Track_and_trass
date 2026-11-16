const {
  addNewLocation,
  getLocationWithId,
  updateLocation,
  getLocations,
  addBulkLocations,
  getLocationTree,
  getAvailableLocations,
  deleteLocationTree,
} = require("../dataLayer/locationsDL");

const insertNewLocation = async (req, res) => {
  try {
    const { code, name, type, attributes, user_id, layout, stack, parent } =
      req.body;

    if (!code || !name || !type) {
      return res.status(400).json({
        message: "All fields are required fields",
      });
    }

    const result = await addNewLocation(
      code,
      name,
      type,
      attributes,
      user_id,
      layout,
      stack,
      parent,
    );
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Add New Location Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const insertBulkLocations = async (req, res) => {
  try {
    const { locations, user_id } = req.body;

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({
        message: "Locations array is required",
      });
    }

    const result = await addBulkLocations(locations, user_id);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Add Bulk Locations Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchAllLocations = async (req, res) => {
  try {
    const result = await getLocations();
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Get Locations Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchLocationWithId = async (req, res) => {
  try {
    const { location_id } = req.query;

    if (!location_id) {
      return res.status(400).json({ message: "Location ID is required" });
    }

    const result = await getLocationWithId(location_id);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Get Location With ID Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateExistingLocation = async (req, res) => {
  try {
    const { location_id, code, name, type, attributes, user_id } = req.body;
    if (!location_id || !code || !name || !type) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const result = await updateLocation(
      location_id,
      code,
      name,
      type,
      attributes,
      user_id,
    );
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Update Location Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchLocationTree = async (req, res) => {
  try {
    const result = await getLocationTree();
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Get Location Tree Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchAvailableLocations = async (req, res) => {
  try {
    const result = await getAvailableLocations();
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Get Available Locations Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteCompleteTree = async (req, res) => {
  try {
    const { locationId } = req.query;
    const result = await deleteLocationTree(locationId);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Get Available Locations Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  insertNewLocation,
  fetchAllLocations,
  fetchLocationWithId,
  updateExistingLocation,
  insertBulkLocations,
  fetchLocationTree,
  fetchAvailableLocations,
  deleteCompleteTree,
};
