const {
  addNewMaterial,
  getAllMaterials,
  updateExistingMaterial,
  addMultipleMaterials,
  checkMaterialValidity,
  checkStaleMaterials,
  deleteMaterial,
} = require("../dataLayer/materialsDL");
const fs = require("fs");
const path = require("path");
const { log } = require("winston");

const insertNewMaterial = async (req, res) => {
  try {
    const { code, name, description, uom, attributes, quantity, user_id } =
      req.body;

    if (!code || !name || !quantity || !description || !uom || !attributes) {
      return res.status(400).json({ message: "All Fields Required" });
    }

    const image_urls =
      req.files?.map((file) => `/uploads/materials/${file.filename}`) || [];

    const result = await addNewMaterial(
      code,
      name,
      description,
      uom,
      attributes,
      quantity,
      user_id,
      image_urls,
    );

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Add New Material Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const insertBulkMaterials = async (req, res) => {
  try {
    const materials = req.body;

    if (!Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({ message: "Materials array is required" });
    }

    const isValid = materials.every(
      (m) =>
        m.code &&
        m.name &&
        m.quantity &&
        m.description &&
        m.uom &&
        m.attributes,
    );

    if (!isValid) {
      return res
        .status(400)
        .json({ message: "One or more materials are missing required fields" });
    }

    const image_urls =
      req.files?.map((file) => `/uploads/materials/${file.filename}`) || [];
    const result = await addMultipleMaterials(materials);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Bulk Insert Materials Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchAllMaterials = async (req, res) => {
  try {
    const result = await getAllMaterials();
    const baseURL = `${req.protocol}://${req.get("host")}`;

    const updatedData = result.data.map((item) => {
      let arr = [];

      if (Array.isArray(item.image_urls)) {
        arr = item.image_urls;
      } else if (typeof item.image_urls === "string") {
        arr = item.image_urls.replace(/[{}]/g, "").split(",");
      }

      return {
        ...item,
        image_urls: arr.map((url) => `${baseURL}${url}`),
      };
    });

    return res.status(result.status).json({
      status: result.status,
      message: result.message,
      data: updatedData,
    });
  } catch (error) {
    console.error("Fetch All Materials Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateMaterial = async (req, res) => {
  try {
    const {
      material_id,
      code,
      name,
      description,
      uom,
      attributes,
      quantity,
      user_id,
      image_urls,
    } = req.body;

    if (
      !material_id ||
      !code ||
      !name ||
      !quantity ||
      !description ||
      !uom ||
      !attributes ||
      !user_id
    )
      return res.status(400).json({
        message: "All Fields Required",
      });

    const result = await updateExistingMaterial(
      material_id,
      code,
      name,
      description,
      uom,
      attributes,
      quantity,
      user_id,
      image_urls,
    );
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Update Material Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchMaterialValidity = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: "Material code is required" });
    }
    const result = await checkMaterialValidity(code);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Material Validity Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const materialPresenceFromToDate = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: "Material code is required" });
    }
    const result = await checkMaterialValidity(code);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Material Validity Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchStaleMaterials = async (req, res) => {
  try {
    const result = await checkStaleMaterials();
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Fetch Stale Material Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteStaleMaterials = async (req, res) => {
  try {
    const { material_id } = req.query;
    const result = await deleteMaterial(material_id);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Delete Stale Material Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  insertNewMaterial,
  fetchAllMaterials,
  updateMaterial,
  insertBulkMaterials,
  fetchMaterialValidity,
  materialPresenceFromToDate,
  fetchStaleMaterials,
  deleteStaleMaterials,
};
