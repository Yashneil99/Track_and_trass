const con = require("../config/databaseCon");

// const raiseNewRequest = async (location, material,available_bags) => {
//   try {
//     const query = `
//             INSERT INTO public.raise_request (
//                 location, no_of_bags, available_bags,status
//             ) VALUES ($1, $2, $3, $4)
//             RETURNING *;
//         `;

//     const values = [location, material,available_bags, "PENDING"];

//     const result = await con.query(query, values);

//     return {
//       status: 201,
//       message: "New Outward Request Raised successfully",
//       data: result.rows[0],
//     };
//   } catch (error) {
//     console.error("Raise Request Error:", error);
//     throw new Error("Failed to raise request");
//   }
// };

const raiseNewRequest = async (location, no_of_bags, available_bags, materials) => {
  try {
    // 1. Check for an existing PENDING request for this location
    const checkQuery = `
      SELECT *
      FROM public.raise_request 
      WHERE location = $1 AND status = 'PENDING'
      LIMIT 1;
    `;
    
    const existingRequest = await con.query(checkQuery, [location]);

    if (existingRequest.rows.length > 0) {
      return {
        status: 409, // Conflict
        message: `A request for location '${location}' is already PENDING. Please wait for the current request to be processed.`,
      };
    }

    // 2. If no pending request, proceed with the INSERT
    const insertQuery = `
      INSERT INTO public.raise_request (
        location, no_of_bags, available_bags, status, materials
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    // materials arrives as a JS array. node-postgres serializes an array
    // parameter as a Postgres ARRAY literal ('{...}'), which is invalid JSON, so
    // the jsonb column rejects it (22P02). Hand it a real JSON string instead.
    const materialsJson =
      typeof materials === "string" ? materials : JSON.stringify(materials);
    const values = [location, no_of_bags, available_bags, "PENDING", materialsJson];
    const result = await con.query(insertQuery, values);

    return {
      status: 201,
      message: "New Outward Request Raised successfully",
      data: result.rows[0],
    };

  } catch (error) {
    console.error("Raise Request Error:", error);
    throw new Error("Failed to raise request");
  }
};

const updateRaiseRequest = async (status, raise_id) => {
  try {
    const query = `
      UPDATE raise_request 
      SET status = $1 
      WHERE raise_id = $2
      RETURNING *;
    `;

    const values = [status, raise_id];

    const result = await con.query(query, values);

    if (result.rowCount === 0) {
      return { status: 404, message: "Request not found" };
    }

    return {
      status: 200,
      message: "Request updated successfully",
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Update Request Error:", error);
    throw new Error("Failed to update request");
  }
};

const deleteRaiseRequest = async (raise_id) => {
  try {
    const query = `
      DELETE FROM raise_request
      WHERE raise_id = $1
      RETURNING *;
    `;

    const result = await con.query(query, [raise_id]);

    if (result.rowCount === 0) {
      return { status: 404, message: "Request not found" };
    }

    return {
      status: 200,
      message: "Request deleted successfully",
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Delete Request Error:", error);
    throw new Error("Failed to delete request");
  }
};

const getPendingRaiseRequests = async () => {
  try {
    const query = `
      SELECT * FROM raise_request 
      WHERE status = 'PENDING' 
      ORDER BY created_at ASC; -- FIFO: Oldest requests processed first
    `;
    
    const result = await con.query(query);

    return {
      status: 200,
      data: result.rows, // Returns an array of all pending requests
    };
  } catch (error) {
    console.error("Fetch Pending Requests Error:", error);
    throw new Error("Failed to fetch pending requests");
  }
};

// Apply an outward submission to a raise request (supports PARTIAL picks).
//
// `outwarded` is what the device actually removed this round:
//   [{ garden, garden_inv_no, grade, count }, ...]
//
// For a request WITH a materials pick-list we decrement each matching line's
// bags_to_remove, drop lines that hit 0, and recompute no_of_bags from what's
// left. For a legacy request WITHOUT materials we just subtract the total count
// from no_of_bags. Anything left → stays PENDING (reappears next time); nothing
// left → COMPLETED (drops off getPendingRaiseRequest).
const applyOutward = async (raise_id, outwarded) => {
  try {
    const sel = await con.query(
      `SELECT raise_id, no_of_bags, materials FROM raise_request WHERE raise_id = $1`,
      [raise_id],
    );
    if (sel.rows.length === 0) {
      return { status: 404, message: "Request not found" };
    }

    const row = sel.rows[0];
    const materials = Array.isArray(row.materials) ? row.materials : [];
    const list = Array.isArray(outwarded) ? outwarded : [];

    const norm = (s) => (s == null ? "" : String(s).trim().toUpperCase());
    const lineKey = (m) =>
      `${norm(m.garden)}|${norm(m.garden_inv_no)}|${norm(m.grade)}`;

    // Total bags outwarded this round (used for the legacy no-materials path).
    const totalOut = list.reduce((s, o) => s + (parseInt(o.count, 10) || 0), 0);

    let remaining;
    let newNoOfBags;

    if (materials.length > 0) {
      // Sum outwarded counts per garden/invoice/grade line.
      const outMap = new Map();
      for (const o of list) {
        const k = lineKey(o);
        outMap.set(k, (outMap.get(k) || 0) + (parseInt(o.count, 10) || 0));
      }

      remaining = [];
      for (const m of materials) {
        const taken = outMap.get(lineKey(m)) || 0;
        const left = Math.max(0, (parseInt(m.bags_to_remove, 10) || 0) - taken);
        if (left > 0) remaining.push({ ...m, bags_to_remove: left });
      }
      newNoOfBags = remaining.reduce(
        (s, m) => s + (parseInt(m.bags_to_remove, 10) || 0),
        0,
      );
    } else {
      // Legacy: no pick-list, just draw down the total.
      remaining = [];
      newNoOfBags = Math.max(0, (parseInt(row.no_of_bags, 10) || 0) - totalOut);
    }

    const completed = newNoOfBags <= 0 && remaining.length === 0;
    const newStatus = completed ? "COMPLETED" : "PENDING";

    const upd = await con.query(
      `UPDATE raise_request
         SET materials = $1,
             no_of_bags = $2,
             status = $3
       WHERE raise_id = $4
       RETURNING *;`,
      // Same jsonb-vs-array-literal trap as the insert: stringify the array.
      [JSON.stringify(remaining), newNoOfBags, newStatus, raise_id],
    );

    return {
      status: 200,
      message: completed
        ? "Outward complete — request fully picked."
        : "Partial outward applied — remaining bags kept.",
      completed,
      data: upd.rows[0],
    };
  } catch (error) {
    console.error("Apply Outward Error:", error);
    throw new Error("Failed to apply outward");
  }
};

module.exports = {
  raiseNewRequest,
  updateRaiseRequest,
  deleteRaiseRequest,
  getPendingRaiseRequests,
  applyOutward,
};
