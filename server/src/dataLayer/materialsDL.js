const con = require("../config/databaseCon");
const { addNewAudit } = require("./auditDL");

const addNewMaterial = async (
  code,
  name,
  description,
  uom,
  attributes,
  quantity,
  user_id,
  image_urls,
) => {
  try {
    // 1. Check if the material code already exists
    const checkQuery = `SELECT code FROM public.materials WHERE name = $1 LIMIT 1;`;
    const existing = await con.query(checkQuery, [name]);

    if (existing.rowCount > 0) {
      return {
        status: 409, // 409 Conflict
        message: `Material "${name}" already exists.`,
      };
    }

    // 2. Start a transaction to ensure both INSERT and AUDIT succeed together
    await con.query("BEGIN");

    const insertQuery = `
      INSERT INTO public.materials (
        code, name, description, uom, attributes, quantity, image_urls, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;`;

    const values = [
      code,
      name,
      description,
      uom,
      attributes,
      quantity,
      image_urls,
      "active", // Default status
    ];
    const result = await con.query(insertQuery, values);

    // 3. Add Audit Log
    if (result?.rowCount > 0) {
      await addNewAudit(
        user_id,
        code,
        name,
        description,
        uom,
        attributes,
        quantity,
      );
    }

    await con.query("COMMIT");

    return {
      status: 201,
      message: "New Material Added successfully",
      data: result.rows[0],
    };
  } catch (error) {
    await con.query("ROLLBACK"); // Undo changes if anything fails
    console.error("Error Inserting New Material:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const addMultipleMaterials = async (materials, user_id) => {
  if (!Array.isArray(materials) || materials.length === 0) {
    return { status: 400, message: "No materials provided" };
  }

  try {
    const uniqueMaterials = materials.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.name === item.name),
    );
    console.log(uniqueMaterials);
    const codesToCheck = uniqueMaterials?.map((m) => m.name);
    const checkQuery = `SELECT name FROM public.materials WHERE name = ANY($1)`;
    const existingResult = await con.query(checkQuery, [codesToCheck]);
    const existingCodes = existingResult.rows.map((row) => row.name);
    const newMaterials = uniqueMaterials.filter(
      (m) => !existingCodes.includes(m.name),
    );

    console.log("New materials to insert:", newMaterials);

    if (newMaterials.length === 0) {
      return {
        status: 409,
        message: "All provided materials already exist in the database.",
        existing: existingCodes,
      };
    }

    const columns = [
      "code",
      "name",
      "description",
      "uom",
      "attributes",
      "quantity",
      "image_urls",
      "status",
    ];
    const placeholders = [];
    const flatValues = [];

    newMaterials.forEach((m, index) => {
      const offset = index * columns.length;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`,
      );
      flatValues.push(
        m.code,
        m.name,
        m.description,
        m.uom,
        m.attributes,
        m.quantity,
        m.image_urls,
        "active", // Default status
      );
    });

    const query = `
      INSERT INTO public.materials (${columns.join(", ")})
      VALUES ${placeholders.join(", ")}
      RETURNING *;
    `;
    const result = await con.query(query, flatValues);

    if (result?.rowCount > 0) {
      return {
        status: 201,
        message: `${result.rowCount} new materials added. ${existingCodes.length} skipped (already existed).`,
        data: result.rows,
        skipped: existingCodes,
      };
    }
  } catch (error) {
    console.error("Error Inserting Multiple Materials:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getAllMaterials = async () => {
  try {
    const query = `SELECT * FROM public.materials ORDER BY created_at DESC`;
    const result = await con.query(query);
    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Materials:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const updateExistingMaterial = async (
  material_id,
  code,
  name,
  description,
  uom,
  attributes,
  quantity,
  user_id,
  image_urls,
) => {
  try {
    const query = `
        UPDATE public.materials
        SET 
        code = $1,
        name = $2,
        description = $3,
        uom = $4,
        attributes = $5,
        quantity = $6,
        image_urls = $8
        WHERE material_id = $7
        RETURNING *;
    `;
    const values = [
      code,
      name,
      description,
      uom,
      attributes,
      quantity,
      material_id,
      image_urls,
    ];
    const result = await con.query(query, values);

    if (result.rowCount === 0) {
      return { status: 204, message: "Material not found" };
    }

    if (result?.rowCount > 0) {
      await addNewAudit(
        user_id,
        code,
        name,
        description,
        uom,
        attributes,
        quantity,
      );
    }

    return {
      status: 200,
      message: "Material Updated successfully",
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Error Updating Material:", error);
    return { status: 500, message: "Internal server error" };
  }
};

// const checkMaterialValidity = async (code) => {
//   try {
//     const query = `SELECT * FROM public.materials WHERE code = $1 LIMIT 1;`;
//     const result = await con.query(query, [code]);

//     if (result.rows.length === 0) {
//       return {
//         isValid: false,
//         status: 404,
//         message: `RFID '${code}' does not exist in the registry.`
//       };
//     }

//     const material = result.rows[0];

//     if (material.status === 'inactive') {
//       return {
//         status: 200,
//         isValid: true,
//         isActive: false,
//         message: "RFID is valid to use currently not in use.",
//         data: material.code
//       };
//     }

//     return {
//       status: 200,
//       isValid: true,
//       isActive: true,
//       message: "RFID is valid and active.",
//       data: material.code
//     };

//   } catch (error) {
//     console.error(`Error validating material syntax for '${code}':`, error);
//     return {
//       status: 500,
//       message: "Internal server error during material verification."
//     };
//   }
// };

const checkMaterialValidity = async (code) => {
  try {
    // 1. Fetch ALL rows matching this code (Removed LIMIT 1)
    const query = `SELECT * FROM public.materials WHERE code = $1;`;
    const result = await con.query(query, [code]);

    // A tag is registered BY inward, so "never seen before" is the normal state of a
    // blank tag, not an error. isValid answers "may I put this tag on a new bag?" —
    // and for a fresh tag the answer is yes. Returned in the same shape as the
    // all-inactive case below (a reused tag), because to inward they are the same
    // thing: a tag with no bag currently on it. isRegistered distinguishes them for
    // anyone who cares. Not a 404 either — the check succeeded; a 404 makes
    // axios/fetch throw, so callers reported it as a network error.
    if (result.rows.length === 0) {
      return {
        status: 200,
        isValid: true,
        isActive: false,
        isRegistered: false,
        totalEntriesFound: 0,
        activeCount: 0,
        message: `RFID '${code}' is new. It is valid to use and will be registered on inward.`,
        code,
      };
    }

    const activeEntries = result.rows.filter((row) => row.status === "active");
    const hasActiveEntries = activeEntries.length > 0;

    if (hasActiveEntries) {
      return {
        status: 200,
        isValid: true,
        isActive: true,
        isRegistered: true,
        // totalEntriesFound: result.rows.length,
        activeCount: activeEntries.length,
        message: `RFID is active. It has ${activeEntries.length} active record(s) in the system with bag ${activeEntries[0].name}.`,
        code: activeEntries[0].code, // Returns the matching code context
      };
    }

    // Case C: Multiple entries exist, but ALL of them are 'inactive'
    return {
      status: 200,
      isValid: true,
      isActive: false,
      isRegistered: true,
      totalEntriesFound: result.rows.length,
      activeCount: 0,
      message: `RFID is valid to use. All ${result.rows.length} existing record(s) are currently inactive.`,
      code: result.rows[0].code,
    };
  } catch (error) {
    console.error(
      `Error validating material structural syntax for '${code}':`,
      error,
    );
    return {
      status: 500,
      message: "Internal server error during material verification.",
    };
  }
};

const checkStaleMaterials = async () => {
  try {
    const query = `
      SELECT m.* FROM public.materials m
      LEFT JOIN public.material_movements mm ON m.name = mm.material
      WHERE mm.material IS NULL;
    `;

    const result = await con.query(query);

    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Stale Materials:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const deleteMaterial = async (material_id) => {
  try {
    const query = `DELETE FROM public.materials WHERE material_id = $1`;
    const result = await con.query(query, [material_id]);

    if (result.rowCount === 0) {
      return { status: 404, message: "Material not found" };
    }

    return {
      status: 200,
      message: "Material deleted successfully",
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Deleting Material:", error);
    return { status: 500, message: "Internal server error" };
  }
};

module.exports = {
  addNewMaterial,
  getAllMaterials,
  updateExistingMaterial,
  checkMaterialValidity,
  addMultipleMaterials,
  checkStaleMaterials,
  deleteMaterial,
};
