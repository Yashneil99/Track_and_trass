import api from "../../services/api";

// POST: Create Material
export const createMaterialRequest = async (payload) => {
  try {
    const { data } = await api.post("/api/materials/addNewMaterial", payload, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  } catch (error) {
    console.log(error);
  }
};

// GET: Fetch All Materials
export const getAllMaterialsRequest = async () => {
  const res = await api.get("/api/materials/getAllMaterials", {
    withCredentials: true,
  });
  return res.data.data;
};

// UPDATE: Edit Existing Material
export const updateMaterialRequest = async (payload) => {
  const { data } = await api.post(
    "/api/materials/updateExistingMaterial",
    payload,
  );
  return data;
};

export const getStaleMaterialsRequest = async () => {
  const res = await api.get("/api/materials/getStaleMaterials");
  return res.data.data;
};

export const deleteMaterialRequest = async (materialId) => {
  const res = await api.delete("/api/materials/deleteMaterial", {
    params: { material_id : materialId },
  });
  return res.data.data;
};
