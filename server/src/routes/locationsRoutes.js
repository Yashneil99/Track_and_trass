const express = require("express");
const router = express.Router();
const {
  fetchAllLocations,
  fetchLocationWithId,
  insertNewLocation,
  updateExistingLocation,
  insertBulkLocations,
  fetchLocationTree,
  fetchAvailableLocations,
  deleteCompleteTree,
} = require("../controllers/locationsController");
const verifyToken = require("../middlewares/verifyUnifyToken");
const { cache, clearCache } = require("../middlewares/cache");

router.get(
  "/getAllLocations",
  verifyToken,
  // cache("all_locations", 600),
  fetchAllLocations,
);
router.post(
  "/addNewLocation",
  verifyToken,
  async (req, res, next) => {
    await clearCache("all_locations");
    next();
  },
  insertNewLocation,
);
router.post(
  "/addBulkLocations",
  // verifyToken,
  async (req, res, next) => {
    await clearCache("all_locations");
    next();
  },
  insertBulkLocations,
);
router.post(
  "/updateExistingLocation",
  verifyToken,
  async (req, res, next) => {
    await clearCache("all_locations");
    next();
  },
  updateExistingLocation,
);
router.get("/", verifyToken, fetchLocationWithId);
router.get(
  "/tree",
  verifyToken,
  // cache("location_tree", 600),
  fetchLocationTree,
);
router.get(
  "/binLocationsWithOccupancyAvailability",
  // verifyToken,
  // cache("available_locations", 600),
  fetchAvailableLocations,
);
router.delete("/deleteLocationTree", deleteCompleteTree);

module.exports = router;
