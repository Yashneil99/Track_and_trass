const express = require("express");
const router = express.Router();
const {
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
  fetchMaterialCurrentLocation,
} = require("../controllers/materialMovementsController");
const verifyToken = require("../middlewares/verifyUnifyToken");
const { cache, clearCache } = require("../middlewares/cache");

router.post(
  "/addNewMovement",
  verifyToken,
  async (req, res, next) => {
    await clearCache("all_movements");
    next();
  },
  addNewMovement,
);
router.post(
  "/addBulkMovements",
  // verifyToken,
  async (req, res, next) => {
    await clearCache("all_movements");
    next();
  },
  insertBulkMovements,
);
router.post(
  "/completeInTransitMovement",
  // verifyToken,
  completeMovement,
);
router.post(
  "/changeAssignedBin",
  // verifyToken,
  async (req, res, next) => {
    await clearCache("all_movements");
    next();
  },
  changeAssignedBin,
);
router.get("/getAllMovements", verifyToken, fetchAllMovements);
router.get(
  "/getMaterialMovemntOverTimeThroughLocations",
  verifyToken,
  fetchMaterialMovemntOverTimeThroughLocations,
);
router.get(
  "/getMaterialPresenceAtLocationToday",
  verifyToken,
  fetchMaterialPresenceAtLocationToday,
);
router.get(
  "/getAllMaterialPresenceAtLocationSpecificDate",
  verifyToken,
  fetchAllMaterialPresenceAtLocationSpecificDate,
);
router.get(
  "/getAverageOfAllMovementTime",
  verifyToken,
  fetchAverageOfAllMovementTime,
);
router.get(
  "/getAverageOfMovementTimePerRoute",
  verifyToken,
  fetchAverageOfMovementTimePerRoute,
);
router.get(
  "/getMaterialRoutingHistoryTillDate",
  verifyToken,
  fetchMaterialRoutingHistoryTillDate,
);
router.get(
  "/getAllCurrentMaterialPresenceAtAllLocations",
  verifyToken,
  fetchAllCurrentMaterialPresenceAtAllLocations,
);
router.get(
  "/getOccupancyDistribution",
  verifyToken,
  occupancyDistribution,
);
router.get(
  "/getIntransitMovements",
  // verifyToken,
  fetchIntransitMovements,
);
router.get(
  "/getMovedMaterialMovements",
  // verifyToken,
  fetchMovedMaterialMovements,
);
router.get(
  "/getOutwardIntransitMovements",
  // verifyToken,
  fetchOutwardIntransitMovements,
);
router.get(
  "/getMaterialPresenceFromToDate",
  verifyToken,
  fetchMaterialPresenceFromToDate
)
router.post(
  "/materialCurrentPresence",
  fetchMaterialCurrentLocation
)

module.exports = router;
