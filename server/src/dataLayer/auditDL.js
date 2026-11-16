const con = require("../config/databaseCon");

const addNewAudit = async (
  user_id,
  material,
  name,
  description,
  uom,
  attributes,
  quantity,
  location,
  type
) => {
  try {
    const values = [
      user_id,
      material || null,
      name,
      description,
      uom || null,
      attributes,
      quantity || null,
      location || null,
      type || null,
    ];

    const query = `
      INSERT INTO audit_logs 
      (user_id, material, name, description, uom, attributes, quantity, location, type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *;
    `;

    const result = await con.query(query, values);
    return { status: 201, message: "New Audit Created", data: result.rows[0] };
  } catch (error) {
    console.error("Error in inserting new audit:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getAllAudits = async () => {
  try {
    const query = `
      SELECT 
       *
      FROM public.audit_logs
      ORDER BY audit_at DESC;
    `;

    const result = await con.query(query);
    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Audit Logs:", error);
    return { status: 500, message: "Internal server error" };
  }
};

module.exports = {
  addNewAudit,
  getAllAudits,
};
