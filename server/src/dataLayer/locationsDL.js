const con = require("../config/databaseCon");
const {
  cleanAttributes,
  groupLocationsByName,
  buildLocationTree,
} = require("../utils/helpers");
const { addNewAudit } = require("./auditDL");

const addNewLocation = async (
  code,
  name,
  type,
  attributes,
  user_id,
  layout,
) => {
  try {
    const query = `
      INSERT INTO public.locations (
        code, name, type, attributes,layout,stack,parent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const values = [code, name, type, attributes, layout, stack, parent];
    const result = await con.query(query, values);

    if (result?.rowCount > 0) {
      await addNewAudit(
        user_id,
        null,
        name,
        null,
        null,
        attributes,
        null,
        code,
        type,
      );
    }

    return {
      status: 201,
      message: "New location added successfully",
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Error inserting new location:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const addBulkLocations = async (locations, user_id) => {
  try {
    // De-duplicate by code (keep the latest occurrence). A flattened tree can
    // contain the same code twice, which would otherwise trip Postgres'
    // "ON CONFLICT DO UPDATE cannot affect row a second time". A Map preserves
    // first-seen order, so parents still come before their children.
    // Validate codes. Two different nodes sharing a code is a data-entry error
    // (the code is a unique identifier), so reject it with a clear message
    // instead of silently merging/losing a node.
    const seen = new Set();
    const duplicates = new Set();
    const missingCode = [];
    const uniqueLocations = [];

    for (const loc of locations) {
      const code = loc && loc.code ? String(loc.code).trim() : "";
      if (!code) {
        missingCode.push(loc?.name || "(unnamed)");
        continue;
      }
      if (seen.has(code)) {
        duplicates.add(code);
        continue;
      }
      seen.add(code);
      uniqueLocations.push(loc);
    }

    if (duplicates.size > 0) {
      return {
        status: 409,
        message: `Duplicate location code(s) in this configuration: ${[...duplicates].join(
          ", ",
        )}. Each location must have a unique code.`,
      };
    }

    if (missingCode.length > 0) {
      return {
        status: 400,
        message: `These locations are missing a code: ${missingCode.join(
          ", ",
        )}. Every location needs a code.`,
      };
    }

    if (uniqueLocations.length === 0) {
      return { status: 400, message: "No valid locations to save" };
    }

    const values = [];

    const placeholders = uniqueLocations
      .map((loc, index) => {
        const i = index * 6;

        values.push(
          loc.code,
          loc.name,
          loc.type,
          loc.attributes,
          loc.stack || null,
          loc.parent || null,
        );

        return `($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6})`;
      })
      .join(",");

    // Upsert: existing codes are refreshed instead of crashing the batch.
    // `xmax = 0` is true only for freshly inserted rows, so we can tell
    // inserts apart from updates for the summary message.
    const query = `
      INSERT INTO public.locations (
        code, name, type, attributes, stack, parent_id
      ) VALUES ${placeholders}
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        attributes = EXCLUDED.attributes,
        stack = EXCLUDED.stack,
        parent_id = EXCLUDED.parent_id
      RETURNING *, (xmax = 0) AS inserted;
    `;

    const result = await con.query(query, values);

    let insertedCount = 0;
    let updatedCount = 0;

    for (const row of result.rows) {
      if (row.inserted) insertedCount++;
      else updatedCount++;

      await addNewAudit(
        user_id,
        null,
        row.name,
        null,
        null,
        row.attributes,
        null,
        row.code,
        row.type,
      );
    }

    return {
      status: 201,
      message: `Bulk locations saved: ${insertedCount} added, ${updatedCount} updated.`,
      data: result.rows,
    };
  } catch (error) {
    console.error("Bulk insert error:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getLocations = async () => {
  try {
    const query = `
      SELECT *
      FROM public.locations
      ORDER BY created_at DESC;
    `;

    const result = await con.query(query);

    if (result.rows.length === 0) {
      return {
        status: 404,
        message: "No locations found",
        data: [],
      };
    }

    return {
      status: 200,
      message: "Locations fetched successfully",
      data: result.rows,
    };
  } catch (error) {
    console.error("Error fetching locations:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getLocationWithId = async (location_id) => {
  try {
    const query = `
      SELECT *
      FROM public.locations
      WHERE location_id = $1;
    `;

    const result = await con.query(query, [location_id]);

    if (result.rows.length === 0) {
      return {
        status: 204,
        message: "Location not found",
        data: null,
      };
    }

    return {
      status: 200,
      message: "Location fetched successfully",
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Error fetching location by ID:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const updateLocation = async (
  location_id,
  code,
  name,
  type,
  attributes,
  user_id,
) => {
  try {
    const query = `
      UPDATE public.locations
      SET 
        code = $1,
        name = $2,
        type = $3,
        attributes = $4
      WHERE location_id = $5
      RETURNING *;
    `;

    const values = [code, name, type, attributes, location_id];
    const result = await con.query(query, values);

    if (result.rows.length === 0) {
      return {
        status: 204,
        message: "Location not found",
      };
    }

    if (result?.rowCount > 0) {
      await addNewAudit(
        user_id,
        null,
        name,
        null,
        null,
        attributes,
        null,
        code,
        type,
      );
    }

    return {
      status: 200,
      message: "Location updated successfully",
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Error updating location:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getParentChildLocations = async () => {
  try {
    const res = await getLocations();
    const grouped = groupLocationsByName(res?.data);

    if (grouped.length === 0) {
      return {
        status: 404,
        message: "No locations found",
        data: [],
      };
    }

    return {
      status: 200,
      message: "Locations grouped successfully",
      data: grouped,
    };
  } catch (error) {
    console.error("Error grouping locations:", error);
    return {
      status: 500,
      message: "Internal server error",
      data: [],
    };
  }
};

const getLocationTree = async () => {
  try {
    const res = await getLocations();
    const tree = buildLocationTree(res?.data);

    if (tree.length === 0) {
      return {
        status: 404,
        message: "No locations found",
        data: [],
      };
    }

    return {
      status: 200,
      message: "Locations tree built successfully",
      data: tree,
    };
  } catch (error) {
    console.error("Error building location tree:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getAvailableLocations = async () => {
  try {
    const query = `
                    WITH RECURSIVE flat_locations AS (
                    -- Anchor Member
                    SELECT 
                        code, 
                        name, 
                        parent_id, 
                        type, 
                        stack, 
                        attributes,
                        reserved,
                        CAST(attributes ->> 'capacity' AS INTEGER) AS capacity  
                    FROM locations
                    WHERE parent_id IS NULL

                    UNION ALL

                    -- Recursive Member
                    SELECT 
                        l.code, 
                        l.name, 
                        l.parent_id, 
                        l.type, 
                        l.stack, 
                        l.attributes,
                        l.reserved,
                        CAST(l.attributes ->> 'capacity' AS INTEGER) AS capacity 
                    FROM locations l
                    INNER JOIN flat_locations fl ON l.parent_id = fl.code
                ),

                -- 1️⃣ Get the absolute latest location for each individual material
                latest_movement AS (
                    SELECT DISTINCT ON (material)
                        material,
                        location AS latest_location,
                        moved_at AS latest_moved_at,
                        status AS latest_status
                    FROM material_movements
                    ORDER BY material, moved_at DESC
                )

                -- 2️⃣ Aggregate everything by location
                SELECT
                    fl.code AS location_code,
                    fl.name AS location_name,
                    fl.type AS location_type,
                    fl.capacity AS total_capacity,
                    
                    COUNT(lm.material) AS occupied_quantity,
                    COALESCE(fl.reserved, 0) AS reserved_quantity,
                    
                    -- Remaining capacity calculation. "reserved" is capacity already
                    -- promised to an Assign-Location'd STN invoice that hasn't been
                    -- submitted yet, so it must be excluded here too, not just from
                    -- the STN allocation algorithm.
                    CAST(fl.capacity - COUNT(lm.material) - COALESCE(fl.reserved, 0) AS VARCHAR) AS remaining_capacity

                FROM flat_locations fl
                LEFT JOIN latest_movement lm 
                    ON lm.latest_location = fl.code
                WHERE fl.type = 'bin'         
                  AND fl.capacity > 0         
                GROUP BY 
                    fl.code, 
                    fl.name, 
                    fl.type, 
                    fl.capacity,
                    fl.reserved
                ORDER BY 
                    fl.code;;
    `;

    const result = await con.query(query);

    if (result.rows.length === 0) {
      return {
        status: 404,
        message: "No locations found",
        data: [],
      };
    }

    return {
      status: 200,
      message: "Locations fetched successfully",
      data: result.rows,
    };
  } catch (error) {
    console.error("Error fetching locations:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const deleteLocationTree = async (rootLocationId) => {
  try {
    const query = `WITH RECURSIVE location_tree AS (
          -- Anchor: Start with the row matching the specific location_id provided
          SELECT code 
          FROM locations 
          WHERE location_id = $1::uuid
          
          UNION ALL
          
          -- Recursive: Join child rows where their 'parent_id' matches the parent's 'code'
          SELECT l.code
          FROM locations l
          INNER JOIN location_tree lt ON l.parent_id = lt.code
      )
      DELETE FROM locations
      WHERE code IN (SELECT code FROM location_tree);`;

    const result = await con.query(query, [rootLocationId]);

    if (result.rowCount === 0) {
      return {
        status: 404,
        message: "No locations found to delete",
        data: [],
      };
    }

    return {
      status: 200,
      message: `Successfully deleted ${result.rowCount} locations`,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error deleting location tree:", error);
    return {
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    };
  }
};

module.exports = {
  addNewLocation,
  getLocations,
  getLocationWithId,
  updateLocation,
  getParentChildLocations,
  addBulkLocations,
  getLocationTree,
  getAvailableLocations,
  deleteLocationTree,
};
