const express = require("express");
const router = express.Router();
const {
  insertNewMaterial,
  fetchAllMaterials,
  updateMaterial,
  insertBulkMaterials,
  fetchMaterialValidity,
  fetchStaleMaterials,
  deleteStaleMaterials,
} = require("../controllers/materialsController");
const verifyToken = require("../middlewares/verifyToken");
const verifyUnifyToken = require("../middlewares/verifyUnifyToken");
const upload = require("../middlewares/upload");
const { cache, clearCache } = require("../middlewares/cache");

router.get(
  "/getAllMaterials",
  // verifyToken,
  // verifyUnifyToken,
  // cache("all_materials", 600),
  fetchAllMaterials,
);
router.post(
  "/addNewMaterial",
  // verifyToken,
  // verifyUnifyToken,
  upload.array("images", 10),
  async (req, res, next) => {
    await clearCache("all_materials"); // invalidate cache
    next();
  },
  insertNewMaterial,
);
router.post(
  "/addBulkMaterials",
  // verifyToken,
  // verifyUnifyToken,
  upload.array("images", 10),
  async (req, res, next) => {
    await clearCache("all_materials"); // invalidate cache
    next();
  },
  insertBulkMaterials,
);
router.post(
  "/updateExistingMaterial",
  // verifyUnifyToken,
  upload.array("images", 10),
  async (req, res, next) => {
    await clearCache("all_materials"); // invalidate cache
    next();
  },
  updateMaterial,
);
router.get(
  "/checkMaterialValidity",
  // verifyUnifyToken,
  fetchMaterialValidity,
);
router.get("/getStaleMaterials", fetchStaleMaterials);
router.delete("/deleteMaterial", deleteStaleMaterials);
module.exports = router;
