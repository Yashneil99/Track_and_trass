const express = require("express");
const {
  raiseOutwardRequest,
  updateRequest,
  deleteRequest,
  fetchLatestPendingRequests,
  applyOutwardRequest,
} = require("../controllers/raiseRequestController");
const router = express.Router();

module.exports = function (io) {
  router.post("/raiseOutwardRequest", raiseOutwardRequest(io));
  router.post("/updateRaiseRequest", updateRequest);
  router.post("/deleteRaiseRequest", deleteRequest(io));
  router.post("/applyOutward", applyOutwardRequest(io));
  router.get("/getPendingRaiseRequest", fetchLatestPendingRequests);
  return router;
};
