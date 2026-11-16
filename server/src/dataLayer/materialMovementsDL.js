const con = require("../config/databaseCon");
const { buildLocationTree, groupByLocation } = require("../utils/helpers");

// const addNewMaterialMovement = async (
//   location,
//   quantity,
//   material,
//   status,
//   purpose,
//   moved_by,
// ) => {
//   try {
//     const query = `
//   INSERT INTO public.material_movements (
//     location, quantity, material, status, purpose, moved_by
//   ) VALUES ($1, $2, $3, $4, $5, $6)
//   RETURNING *;
// `;

//     const values = [location, quantity, material, status, purpose, moved_by];

//     const result = await con.query(query, values);

//     return {
//       status: 201,
//       message: "New Movement Added successfully",
//       data: result.rows[0],
//     };
//   } catch (error) {
//     console.error("Error Inserting New Movement:", error);
//     return { status: 500, message: "Internal server error" };
//   }
// };

const addNewMaterialMovement = async (
  location,
  quantity,
  material,
  status,
  purpose,
  moved_by,
) => {
  try {
    await con.query("BEGIN");
    const movementQuery = `
      INSERT INTO public.material_movements (
        location, quantity, material, status, purpose, moved_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const movementValues = [
      location,
      quantity,
      material,
      status,
      purpose,
      moved_by,
    ];
    const movementResult = await con.query(movementQuery, movementValues);

    // Final gate-out releases the RFID: flip the material inactive. Keyed on the
    // outbound purpose + the dispatch location. "outward" kept alongside the
    // renamed "dispatched" for backward compatibility with pre-rename rows.
    if (
      (purpose === "Material Outward" || purpose === "Material Out") &&
      (location === "dispatched" || location === "outward")
    ) {
      const updateMaterialQuery = `
        UPDATE public.materials 
        SET status = 'inactive'
        WHERE name = $1;
      `;
      await con.query(updateMaterialQuery, [material]);
      console.log(
        `Material ${material} status flipped to inactive due to Outward Movement.`,
      );
    }

    await con.query("COMMIT");

    return {
      status: 201,
      message:
        "New Movement Added successfully" +
        (purpose === "Material Outward" ? " and material deactivated" : ""),
      data: movementResult.rows[0],
    };
  } catch (error) {
    await con.query("ROLLBACK");
    console.error(
      "Error Inserting New Movement (Transaction Rolled Back):",
      error,
    );
    return { status: 500, message: "Internal server error" };
  }
};

// const addNewBulkMaterialMovement = async (movements) => {
//   if (!Array.isArray(movements) || movements.length === 0) {
//     return { status: 400, message: "No movements provided" };
//   }

//   try {
//     // 1. Fetch current status of all incoming materials
//     const uniqueMaterialNames = [...new Set(movements.map((m) => m.material))];
//     const materialStatusResult = await con.query(
//       "SELECT name, status FROM public.materials WHERE name = ANY($1)",
//       [uniqueMaterialNames]
//     );

//     const materialStatuses = new Map(
//       materialStatusResult.rows.map((r) => [r.name, r.status])
//     );

//     // 2. Split movements: valid (active) vs ignored (inactive)
//     const inactiveMovements = movements.filter(
//       (m) => materialStatuses.get(m.material) === 'inactive'
//     );
//     const validMovements = movements.filter(
//       (m) => materialStatuses.get(m.material) !== 'inactive'
//     );

//     // 3. Check for existing movements (duplicates)
//     const uniqueLocations = [...new Set(validMovements.map((m) => m.location))];
//     const existingResult = await con.query(
//       `SELECT material, location FROM public.material_movements WHERE material = ANY($1) AND location = ANY($2)`,
//       [[...new Set(validMovements.map(m => m.material))], uniqueLocations]
//     );

//     const existingKeys = new Set(
//       existingResult.rows.map((row) => `${row.material}|${row.location}`)
//     );

//     const finalInsertList = validMovements.filter((m) => !existingKeys.has(`${m.material}|${m.location}`));
//     const duplicateMovementsCount = validMovements.length - finalInsertList.length;

//     if (finalInsertList.length === 0) {
//       return {
//         status: 409,
//         message: `No new movements added. Skipped: ${inactiveMovements.length} inactive, ${duplicateMovementsCount} duplicates.`
//       };
//     }

//     // 4. Perform Transaction
//     const columns = ["location", "quantity", "material", "status", "purpose", "moved_by"];
//     const placeholders = [];
//     const flatValues = [];

//     finalInsertList.forEach((m, index) => {
//       const offset = index * columns.length;
//       placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
//       flatValues.push(m.location, 1, m.material, m.status, m.purpose, m.moved_by);
//     });

//     await con.query("BEGIN");

//     const result = await con.query(
//       `INSERT INTO public.material_movements (${columns.join(", ")}) VALUES ${placeholders.join(", ")} RETURNING *;`,
//       flatValues
//     );

//     const materialsToDeactivate = [...new Set(
//       finalInsertList.filter((m) => m.purpose === "Material Outward").map((m) => m.material)
//     )];

//     if (materialsToDeactivate.length > 0) {
//       await con.query(`UPDATE public.materials SET status = 'inactive' WHERE name = ANY($1)`, [materialsToDeactivate]);
//     }

//     await con.query("COMMIT");

//     return {
//       status: 201,
//       message: `Success: ${result.rowCount} added. Skipped: ${inactiveMovements.length} inactive, ${duplicateMovementsCount} duplicates. ${materialsToDeactivate.length > 0 ? `Materials deactivated: ${materialsToDeactivate.length}.` : ""}`,
//       data: result.rows
//     };

//   } catch (error) {
//     await con.query("ROLLBACK");
//     console.error("Bulk Insert Error:", error);
//     return { status: 500, message: "Internal server error during bulk insertion." };
//   }
// };

const addNewBulkMaterialMovement = async (movements) => {
  if (!Array.isArray(movements) || movements.length === 0) {
    return { status: 400, message: "No movements provided" };
  }

  try {
    const uniqueMaterialNames = [...new Set(movements.map((m) => m.material))];
    const materialStatusResult = await con.query(
      "SELECT name, status FROM public.materials WHERE name = ANY($1)",
      [uniqueMaterialNames],
    );

    const materialStatuses = new Map(
      materialStatusResult.rows.map((r) => [r.name, r.status.toLowerCase()]),
    );

    // 1. Categorize rejected items
    const rejected = { inactive: 0, inTransit: 0, duplicates: 0 };
    const validMovements = [];

    // 2. Fetch existing movements to check against
    const uniqueLocations = [...new Set(movements.map((m) => m.location))];
    const uniqueMaterials = [...new Set(movements.map((m) => m.material))];

    const existingResult = await con.query(
      `SELECT material, location, status 
       FROM public.material_movements 
       WHERE material = ANY($1)`,
      [uniqueMaterials],
    );

    const existingRows = existingResult.rows;

    // 3. Process each movement with strict checks
    for (const m of movements) {
      // Check Inactive
      if (materialStatuses.get(m.material) === "inactive") {
        rejected.inactive++;
        continue;
      }

      // Check In Transit (Case-insensitive check)
      const isCurrentlyInTransit = existingRows.some(
        (row) =>
          row.material === m.material &&
          row.status.toLowerCase() === "in transit",
      );
      if (isCurrentlyInTransit) {
        rejected.inTransit++;
        continue;
      }

      // Check Duplicates
      const isDuplicate = existingRows.some(
        (row) => row.material === m.material && row.location === m.location,
      );
      if (isDuplicate) {
        rejected.duplicates++;
        continue;
      }

      validMovements.push(m);
    }

    if (validMovements.length === 0) {
      return {
        status: 409,
        message: `No movements added. Inactive: ${rejected.inactive}, In-Transit: ${rejected.inTransit}, Duplicates: ${rejected.duplicates}.`,
      };
    }

    // 4. Perform Transaction
    const columns = [
      "location",
      "quantity",
      "material",
      "status",
      "purpose",
      "moved_by",
    ];
    const placeholders = [];
    const flatValues = [];

    validMovements.forEach((m, index) => {
      const offset = index * columns.length;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`,
      );
      flatValues.push(
        m.location,
        1,
        m.material,
        m.status,
        m.purpose,
        m.moved_by,
      );
    });

    // One pinned connection for the whole transaction. `con.query` is pool.query,
    // which hands out an arbitrary connection per call — so BEGIN, the INSERT and
    // COMMIT could each land on a different one, and none of this would actually
    // be atomic. The reservation drawdown below has to commit with the insert or
    // not at all, so the transaction has to be real.
    const client = await con.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `INSERT INTO public.material_movements (${columns.join(", ")}) VALUES ${placeholders.join(", ")} RETURNING *;`,
        flatValues,
      );

      const materialsToDeactivate = [
        ...new Set(
          validMovements
            .filter((m) => m.purpose === "Material Outward")
            .map((m) => m.material),
        ),
      ];

      if (materialsToDeactivate.length > 0) {
        await client.query(
          `UPDATE public.materials SET status = 'inactive' WHERE name = ANY($1)`,
          [materialsToDeactivate],
        );
      }

      await drawDownReservations(client, result.rows);

      await client.query("COMMIT");

      return {
        status: 201,
        message: `Success: ${result.rowCount} added. Skipped: ${rejected.inactive} inactive, ${rejected.inTransit} in-transit, ${rejected.duplicates} duplicates.`,
        data: result.rows,
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Bulk Insert Error:", error);
    return {
      status: 500,
      message: "Internal server error during bulk insertion.",
    };
  }
};

// A bag that has been inwarded is no longer "on its way" — it is standing in the
// bin. Its capacity has to stop being counted as a reservation and start being
// counted as occupancy, or it is counted TWICE: once in locations.reserved (the
// promise that it is coming) and once in the movement row (the fact that it is
// here). remaining_capacity = capacity - occupied - reserved, so every bag
// inwarded would shave two off the bin's free space instead of one, permanently,
// and bins would report themselves full while half empty.
//
// Driven off the rows the INSERT actually returned, not off what the caller asked
// for: a re-submitted batch is rejected upstream as duplicate/in-transit, inserts
// nothing, and so draws down nothing. That makes this exactly-once without the
// caller having to be careful. It also means every client gets it — the handheld
// never called /incrementSubmitted (the endpoint that was supposed to do this),
// and it sits behind a token the handheld cannot send anyway.
//
// Putaway does not insert movements — it flips the existing row In Transit →
// Moved — so a bag can only pass through here once.
//
// An invoice's reservation is not always one bin: one too big to fit anywhere
// whole is split across several, its allocated_location set to the marker
// 'SPLIT' and a slice per bin in stn_invoice_allocation_splits. Those slices are
// reservations like any other and must be drawn down the same way — matching the
// marker against a bin code instead skips every split bag, which is precisely
// the double-count described above.
const drawDownReservations = async (client, insertedRows) => {
  // Only inward creates a reservation, so only inward can consume one.
  const inward = insertedRows.filter((r) => r.purpose === "Material Inward");
  if (inward.length === 0) return;

  // materials.name is <EPC>_<STN>_<DATETIME>; the garden invoice is in the
  // attributes blob. Count the inserted bags per (STN, invoice, bin).
  const names = inward.map((r) => r.material);
  const meta = await client.query(
    `SELECT name, split_part(name, '_', 2) AS invoice_stn,
            attributes->>'Garden Inv No' AS garden_invoice
     FROM public.materials WHERE name = ANY($1)`,
    [names],
  );
  const byName = new Map(meta.rows.map((r) => [r.name, r]));

  const counts = new Map(); // "stn||invoice||bin" -> bags
  for (const row of inward) {
    const m = byName.get(row.material);
    if (!m || !m.invoice_stn || !m.garden_invoice) continue;
    const key = `${m.invoice_stn}||${m.garden_invoice}||${row.location}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  for (const [key, bags] of counts) {
    const [invoiceStn, gardenInvoice, location] = key.split("||");

    const allocResult = await client.query(
      `SELECT allocation_id, total_bags, bags_submitted, allocated_location
       FROM public.stn_invoice_allocations
       WHERE invoice_stn = $1 AND garden_invoice = $2
       FOR UPDATE`,
      [invoiceStn, gardenInvoice],
    );

    if (allocResult.rows.length === 0) continue; // STN was never allocated a bin
    const alloc = allocResult.rows[0];

    // Which reservation do these bags consume? A normal invoice holds one, in the
    // bin named by allocated_location. An invoice too big for any single bin
    // holds a slice in each of several, and allocated_location reads the literal
    // 'SPLIT' — a marker, never a real code, so it can never equal the bin the
    // bags landed in. Resolve the slice for THIS bin instead.
    const isSplit = alloc.allocated_location === "SPLIT";
    let splitRow = null;
    if (isSplit) {
      const splitResult = await client.query(
        `SELECT split_id, bags, bags_submitted
         FROM public.stn_invoice_allocation_splits
         WHERE allocation_id = $1 AND location_code = $2
         FOR UPDATE`,
        [alloc.allocation_id, location],
      );
      splitRow = splitResult.rows[0] || null;
    }

    // Bags that landed somewhere other than the bin this invoice reserved don't
    // release that reservation — draining the wrong bin's counter is how the
    // numbers rot. Same rule incrementBagsSubmitted enforces with a 409; here we
    // let the inward stand (the bags are physically there) and leave the
    // reservation for the operator to sort out.
    const reservedHere = isSplit ? splitRow !== null : alloc.allocated_location === location;
    if (!alloc.allocated_location || !reservedHere) {
      const reservedIn = isSplit
        ? "a split across other bins"
        : alloc.allocated_location || "no bin";
      console.warn(
        `Inward of ${bags} bag(s) for STN ${invoiceStn} invoice ${gardenInvoice} landed in ${location}, ` +
          `but the invoice is reserved in ${reservedIn} — reservation left untouched.`,
      );
      continue;
    }

    // Never let the drawdown run past what was actually reserved here, or it would
    // release capacity the invoice never held. For a split the ceiling is this
    // bin's slice, not the whole invoice: 8 bags arriving into a 3-bag slice may
    // only consume 3 — the other 5 landed somewhere they were not promised, so
    // they leave the reservation alone, as above.
    const previous = (isSplit ? splitRow.bags_submitted : alloc.bags_submitted) || 0;
    const ceiling = isSplit ? splitRow.bags : alloc.total_bags;
    const updated = Math.min(ceiling, previous + bags);
    const delta = updated - previous;
    if (delta <= 0) continue;

    if (isSplit) {
      await client.query(
        `UPDATE public.stn_invoice_allocation_splits
         SET bags_submitted = $1, updated_at = now()
         WHERE split_id = $2`,
        [updated, splitRow.split_id],
      );
    }

    // The invoice-level tally moves by the same delta either way; for a split it
    // ends up the sum of its slices' progress. Computed in SQL off the stored
    // value rather than the one read above, so the row and its splits cannot
    // drift apart.
    const tally = await client.query(
      `UPDATE public.stn_invoice_allocations
       SET bags_submitted = LEAST(total_bags, COALESCE(bags_submitted, 0) + $1), updated_at = now()
       WHERE allocation_id = $2
       RETURNING bags_submitted, total_bags`,
      [delta, alloc.allocation_id],
    );

    await client.query(
      `UPDATE public.locations
       SET reserved = GREATEST(0, COALESCE(reserved, 0) - $1)
       WHERE code = $2`,
      [delta, location],
    );

    const { bags_submitted: done, total_bags: total } = tally.rows[0];
    console.log(
      `Inward drew down ${delta} reserved bag(s) in ${location} ` +
        `(STN ${invoiceStn}, invoice ${gardenInvoice}: ${done}/${total} submitted` +
        (isSplit ? `, this bin's slice ${updated}/${splitRow.bags}` : "") +
        ")",
    );
  }
};

const getAllMaterialMovements = async () => {
  try {
    const query = `
      SELECT
          l.name AS location,
          l.code AS location_code,
          m.name AS material,
          mm.status,
          mm.purpose,
          mm.movement_id,
          u.name AS moved_by,
          mm.moved_at,
          mm.quantity
      FROM public.material_movements mm
          LEFT JOIN locations l ON l.code = mm.location      -- from location
          LEFT JOIN materials m ON m.name = mm.material     -- input material
          LEFT JOIN users u ON u.user_id = mm.moved_by
      ORDER BY mm.moved_at DESC;`;

    //     const query = `WITH flattened_locations AS (
    //         -- Top-level locations
    //         SELECT
    //             location_id,
    //             code,
    //             name,
    //             type
    //         FROM locations

    //         UNION ALL

    //         -- Flattened child locations from layout JSONB
    //         SELECT
    //             gen_random_uuid() AS location_id,          -- new UUID for child
    //             child->>'code' AS code,
    //             child->>'name' AS name,
    //             child->>'type' AS type
    //         FROM locations,
    //             jsonb_array_elements(layout->'children') AS child
    //     )

    //     SELECT
    //         lf.name AS from_location,
    //         lt.name AS to_location,
    //         p.name AS process,
    //         mi.name AS input_material,
    //         mo.name AS output_material,
    //         mm.movement_id,
    //         u.name AS moved_by,
    //         mm.moved_at,
    //         mm.quantity
    //     FROM material_movements mm
    //     LEFT JOIN flattened_locations lf ON lf.code = mm.from_location
    //     LEFT JOIN flattened_locations lt ON lt.code = mm.to_location
    //     LEFT JOIN materials mi ON mi.code = mm.input_material
    //     LEFT JOIN materials mo ON mo.code = mm.output_material
    //     LEFT JOIN process_definitions p ON p.process_id = mm.process
    //     LEFT JOIN users u ON u.user_id = mm.moved_by
    //     ORDER BY mm.moved_at DESC;
    // `;

    const result = await con.query(query);
    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Material Movements:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getMaterialMovemntOverTimeThroughLocations = async (
  code,
  from_location,
  to_location,
) => {
  try {
    const query = `WITH flattened_locations AS (
                  -- Top-level
                  SELECT
                      location_id,
                      code,
                      name,
                      type
                  FROM locations

                  UNION ALL

                  -- Child locations extracted from layout JSONB
                  SELECT
                      gen_random_uuid() AS location_id,
                      child->>'code' AS code,
                      child->>'name' AS name,
                      child->>'type' AS type
                  FROM locations,
                      jsonb_array_elements(layout->'children') AS child
              )

              SELECT
                  TO_CHAR(mm.moved_at, 'YYYY-MM-DD') AS day,
                  SUM(mm.quantity) AS total_quantity,
                  COUNT(mm.movement_id) AS movement_count
              FROM material_movements mm
              LEFT JOIN flattened_locations fl
                    ON fl.code = mm.location
              WHERE mm.material = $1
                AND mm.location = $2   -- FIXED
                OR mm.location = $3    -- FIXED
              GROUP BY day
              ORDER BY day`;

    const values = [code, from_location, to_location];

    const result = await con.query(query, values);

    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Material Movements:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getMaterialPresenceAtLocationToday = async (code) => {
  try {
    // const query = `
    //   WITH movements_today AS (
    //       SELECT
    //           input_material,
    //           from_location,
    //           to_location,
    //           quantity
    //       FROM material_movements
    //       WHERE input_material = $1
    //       AND DATE(moved_at) = CURRENT_DATE
    //   ),
    //   unioned AS (
    //       SELECT
    //           to_location AS location_code,
    //           quantity,
    //           'IN' AS movement_type
    //       FROM movements_today
    //       WHERE to_location IS NOT NULL

    //       UNION ALL

    //       SELECT
    //           from_location AS location_code,
    //           quantity,
    //           'OUT' AS movement_type
    //       FROM movements_today
    //       WHERE from_location IS NOT NULL
    //   )
    //   SELECT
    //       TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS day,
    //       COALESCE(SUM(CASE WHEN movement_type = 'IN' THEN quantity END), 0) AS total_in,
    //       COALESCE(SUM(CASE WHEN movement_type = 'OUT' THEN quantity END), 0) AS total_out,
    //       (COALESCE(SUM(CASE WHEN movement_type = 'IN' THEN quantity END), 0)
    //       -
    //       COALESCE(SUM(CASE WHEN movement_type = 'OUT' THEN quantity END), 0)) AS net_quantity,
    //       fl.name AS location
    //   FROM unioned u
    //   LEFT JOIN (
    //       SELECT code, name FROM locations
    //       UNION ALL
    //       SELECT child->>'code', child->>'name'
    //       FROM locations, jsonb_array_elements(layout->'children') child
    //   ) AS fl(code, name)
    //   ON fl.code = u.location_code
    //   GROUP BY fl.name
    //   ORDER BY fl.name;
    // `;

    const query = `WITH movements_today AS (
                  SELECT 
                      material,
                      location AS location_code,
                      quantity
                  FROM material_movements
                  WHERE material = $1
                    AND DATE(moved_at) = CURRENT_DATE
              ),

              flattened_locations AS (
                  SELECT code, name
                  FROM locations

                  UNION ALL

                  SELECT 
                      child->>'code',
                      child->>'name'
                  FROM locations,
                      jsonb_array_elements(layout->'children') child
              )

              SELECT
                  TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS day,
                  SUM(quantity) AS total_in,
                  0 AS total_out,
                  SUM(quantity) AS net_quantity,
                  mt.location_code
              FROM movements_today mt
              LEFT JOIN flattened_locations fl
                    ON fl.code = mt.location_code
              GROUP BY mt.location_code
              ORDER BY mt.location_code;`;
    const result = await con.query(query, [code]);

    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Material Presence:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getAllMaterialPresenceAtLocationSpecificDate = async (date) => {
  try {
    // const query = `
    //       WITH movements_today AS (
    //     SELECT
    //         input_material,
    //         from_location,
    //         to_location,
    //         quantity
    //     FROM material_movements
    //     WHERE DATE(moved_at) = DATE($1)
    // ),
    // unioned AS (
    //     SELECT
    //         input_material,
    //         to_location AS location_code,
    //         quantity,
    //         'IN' AS movement_type
    //     FROM movements_today
    //     WHERE to_location IS NOT NULL

    //     UNION ALL

    //     SELECT
    //         input_material,
    //         from_location AS location_code,
    //         quantity,
    //         'OUT' AS movement_type
    //     FROM movements_today
    //     WHERE from_location IS NOT NULL
    // ),
    // flat_locations AS (
    //     SELECT code, name
    //     FROM locations

    //     UNION ALL

    //     SELECT
    //         child->>'code' AS code,
    //         child->>'name' AS name
    //     FROM locations,
    //         jsonb_array_elements(layout->'children') AS child
    // )
    // SELECT
    //     TO_CHAR(DATE($1), 'YYYY-MM-DD') AS day,
    //     u.input_material As material,
    //     COALESCE(SUM(CASE WHEN u.movement_type = 'IN' THEN COALESCE(u.quantity,0) END), 0)  AS total_in,
    //     COALESCE(SUM(CASE WHEN u.movement_type = 'OUT' THEN COALESCE(u.quantity,0) END), 0) AS total_out,
    //     (COALESCE(SUM(CASE WHEN u.movement_type = 'IN' THEN COALESCE(u.quantity,0) END), 0)
    //     -
    //     COALESCE(SUM(CASE WHEN u.movement_type = 'OUT' THEN COALESCE(u.quantity,0) END), 0)) AS net_quantity,
    //     fl.name AS location
    // FROM unioned u
    // LEFT JOIN flat_locations fl
    //       ON fl.code = u.location_code
    // LEFT JOIN materials m          -- change table/name/column as needed
    //       ON m.code = u.input_material
    // GROUP BY fl.name, u.input_material, m.name
    // // ORDER BY fl.name, u.input_material;`;

    const query = `WITH ordered AS (
                  SELECT
                      material,
                      location AS current_location,
                      quantity,
                      moved_at,
                      LAG(location) OVER (
                          PARTITION BY material
                          ORDER BY moved_at
                      ) AS prev_location
                  FROM material_movements
                  WHERE DATE(moved_at) = $1
              ),

              unioned AS (
                  -- IN movement: material arrives at its current location
                  SELECT
                      material,
                      current_location AS location_code,
                      quantity,
                      'IN' AS movement_type
                  FROM ordered

                  UNION ALL

                  -- OUT movement: material leaves its previous location
                  SELECT
                      material,
                      prev_location AS location_code,
                      quantity,
                      'OUT' AS movement_type
                  FROM ordered
                  WHERE prev_location IS NOT NULL
              )

              SELECT
                  TO_CHAR(DATE($1), 'YYYY-MM-DD') AS day,
                  u.material,
                  COALESCE(SUM(CASE WHEN u.movement_type = 'IN'  THEN u.quantity END), 0) AS total_in,
                  COALESCE(SUM(CASE WHEN u.movement_type = 'OUT' THEN u.quantity END), 0) AS total_out,
                  (
                      COALESCE(SUM(CASE WHEN u.movement_type = 'IN'  THEN u.quantity END), 0) -
                      COALESCE(SUM(CASE WHEN u.movement_type = 'OUT' THEN u.quantity END), 0)
                  ) AS net_quantity,
                  u.location_code AS location
              FROM unioned u
              GROUP BY u.location_code, u.material
              ORDER BY u.location_code, u.material`;
    const result = await con.query(query, [date]);
    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Material Presence Specific Date:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getAverageOfAllMovementTime = async (code) => {
  try {
    const query = `
           WITH ordered AS (
          SELECT
              movement_id,
              material,
              location,
              moved_at,
              LAG(location) OVER (
                  PARTITION BY material
                  ORDER BY moved_at
              ) AS prev_location,
              LAG(moved_at) OVER (
                  PARTITION BY material
                  ORDER BY moved_at
              ) AS prev_time
          FROM material_movements
          WHERE material = $1
      ),
      diffs AS (
          SELECT
              material,
              prev_location AS from_location,
              location   AS to_location,
              moved_at - prev_time AS time_taken
          FROM ordered
          WHERE prev_location IS NOT NULL
      )
      SELECT
          material,
          AVG(time_taken) AS avg_time_taken
      FROM diffs
      GROUP BY material;
    `;

    const result = await con.query(query, [code]);

    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Material Avg Time:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getAverageOfMovementTimePerRoute = async (code) => {
  try {
    // const query = `
    //         WITH flattened_locations AS (
    //     -- Top-level locations
    //     SELECT
    //         location_id,
    //         code,
    //         name,
    //         type
    //     FROM locations

    //     UNION ALL

    //     -- Child locations from layout JSONB
    //     SELECT
    //         gen_random_uuid() AS location_id,
    //         child->>'code' AS code,
    //         child->>'name' AS name,
    //         child->>'type' AS type
    //     FROM locations,
    //         jsonb_array_elements(layout->'children') AS child
    // ),

    // ordered AS (
    //     SELECT
    //         mm.input_material,
    //         mm.to_location,
    //         mm.moved_at,
    //         LAG(mm.to_location) OVER (
    //             PARTITION BY mm.input_material
    //             ORDER BY mm.moved_at
    //         ) AS prev_location,
    //         LAG(mm.moved_at) OVER (
    //             PARTITION BY mm.input_material
    //             ORDER BY mm.moved_at
    //         ) AS prev_time
    //     FROM material_movements mm
    //     WHERE mm.input_material = $1
    // ),

    // diffs AS (
    //     SELECT
    //         prev_location AS from_location,
    //         to_location,
    //         moved_at - prev_time AS time_taken
    //     FROM ordered
    //     WHERE prev_location IS NOT NULL
    // )

    // SELECT
    //     fl.name AS from_location,
    //     tl.name AS to_location,
    //     AVG(diffs.time_taken) AS avg_time_taken
    // FROM diffs
    // LEFT JOIN flattened_locations fl ON fl.code = diffs.from_location
    // LEFT JOIN flattened_locations tl ON tl.code = diffs.to_location
    // GROUP BY
    //     fl.name,
    //     tl.name,
    //     diffs.from_location,
    //     diffs.to_location
    // ORDER BY
    //     fl.name,
    //     tl.name;`;

    const query = `WITH flattened_locations AS (
                  -- Top-level locations
                  SELECT
                      code,
                      name
                  FROM locations

                  UNION ALL

                  -- Nested child locations from layout JSON
                  SELECT
                      child->>'code' AS code,
                      child->>'name' AS name
                  FROM locations,
                      jsonb_array_elements(layout->'children') child
              ),

              ordered AS (
                  SELECT
                      mm.material AS material_code,
                      mm.location AS current_location,
                      mm.moved_at,
                      LAG(mm.location) OVER (
                          PARTITION BY mm.material
                          ORDER BY mm.moved_at
                      ) AS prev_location,
                      LAG(mm.moved_at) OVER (
                          PARTITION BY mm.material
                          ORDER BY mm.moved_at
                      ) AS prev_time
                  FROM material_movements mm
                  WHERE mm.material = $1
              ),

              diffs AS (
                  SELECT
                      prev_location AS from_location,
                      current_location AS to_location,
                      moved_at - prev_time AS time_taken
                  FROM ordered
                  WHERE prev_location IS NOT NULL
              )

              SELECT
                  diffs.from_location,
                  diffs.to_location,
                  AVG(diffs.time_taken) AS avg_time_taken
              FROM diffs
              GROUP BY
                  diffs.from_location,
                  diffs.to_location
              ORDER BY
                  diffs.from_location,
                  diffs.to_location`;
    const result = await con.query(query, [code]);

    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Material Avg Time Per Route", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getMaterialRoutingHistoryTillDate = async (code) => {
  try {
    // const query = `WITH flat_locations AS (
    //         SELECT code, name
    //         FROM locations
    //         UNION ALL
    //         SELECT
    //             child->>'code' AS code,
    //             child->>'name' AS name
    //         FROM locations,
    //             jsonb_array_elements(layout->'children') AS child
    //     ),
    //     ordered AS (
    //         SELECT
    //             movement_id,
    //             input_material AS material_code,
    //             from_location,
    //             to_location,
    //             quantity,
    //             moved_at,
    //             LAG(to_location) OVER (
    //                 PARTITION BY input_material
    //                 ORDER BY moved_at
    //             ) AS previous_location,
    //             LAG(moved_at) OVER (
    //                 PARTITION BY input_material
    //                 ORDER BY moved_at
    //             ) AS previous_time
    //         FROM material_movements
    //         WHERE input_material = $1
    //     ),
    //     steps AS (
    //         SELECT
    //             o.material_code,
    //             o.previous_location AS from_location_code,
    //             o.to_location AS to_location_code,
    //             o.previous_time AS left_previous_at,
    //             o.moved_at AS arrived_at,
    //             o.quantity,
    //             EXTRACT(EPOCH FROM (o.moved_at - o.previous_time)) / 3600 AS hours_spent_at_previous,

    //             ROW_NUMBER() OVER (
    //                 PARTITION BY o.material_code
    //                 ORDER BY o.moved_at
    //             ) AS step_no
    //         FROM ordered o
    //     )
    //     SELECT
    //         s.material_code As material,
    //         s.step_no,
    //         fl_from.name AS from_location,
    //         fl_to.name AS to_location,
    //         s.quantity,
    //         s.left_previous_at,
    //         s.arrived_at,
    //         s.hours_spent_at_previous
    //     FROM steps s
    //     LEFT JOIN flat_locations fl_from
    //           ON fl_from.code = s.from_location_code
    //     LEFT JOIN flat_locations fl_to
    //           ON fl_to.code = s.to_location_code
    //     ORDER BY s.material_code, s.step_no;`;

    // One row per step of a bag's journey. Each row describes the bag ARRIVING
    // at to_location at arrived_at, and how long it then sat there.
    //
    // The window is ordered by (moved_at, movement_id). The movement_id
    // tiebreak matters only when one material has two movements at the exact
    // same instant — without it the LAG/LEAD order (and every hours figure
    // derived from it) is undefined. movement_id is 'MO' + a zero-padded
    // sequence, so it sorts in insertion order.
    //
    // Previously this joined a `flat_locations` CTE that UNION ALL'd
    // locations with layout->'children'. It was dead (layout is unused, the
    // schema uses parent_id now) and it selected .code — which the join
    // predicate already guaranteed equalled the input, so the joins resolved
    // nothing and could only ever duplicate rows. Joining `locations` directly
    // for the .name is what was actually intended.
    const query = `WITH ordered AS (
                  SELECT
                      movement_id,
                      material AS material_code,
                      quantity,
                      location AS to_location,
                      moved_at,

                      LAG(location)  OVER w AS previous_location,
                      LAG(moved_at)  OVER w AS previous_time,
                      LEAD(moved_at) OVER w AS next_time
                  FROM material_movements
                  WHERE material = $1
                  WINDOW w AS (PARTITION BY material ORDER BY moved_at, movement_id)
              ),

              steps AS (
                  SELECT
                      o.material_code,
                      o.previous_location AS from_location_code,
                      o.to_location AS to_location_code,
                      o.previous_time AS left_previous_at,
                      o.moved_at AS arrived_at,
                      o.quantity,

                      -- Hours the bag actually sat AT this row's location:
                      -- from arriving here until it left for the next one.
                      -- The final step has no next move — the bag is still
                      -- there — so measure to now() for a live dwell time.
                      EXTRACT(EPOCH FROM (
                          COALESCE(o.next_time, now()) - o.moved_at
                      )) / 3600 AS hours_spent_here,

                      ROW_NUMBER() OVER (
                          PARTITION BY o.material_code
                          ORDER BY o.moved_at, o.movement_id
                      ) AS step_no
                  FROM ordered o
              )

              SELECT
                  s.material_code AS material,
                  s.step_no,
                  COALESCE(lf.name, s.from_location_code) AS from_location,
                  COALESCE(lt.name, s.to_location_code)   AS to_location,
                  s.quantity,
                  s.left_previous_at,
                  s.arrived_at,
                  s.hours_spent_here
              FROM steps s
              LEFT JOIN locations lf ON lf.code = s.from_location_code
              LEFT JOIN locations lt ON lt.code = s.to_location_code
              ORDER BY s.material_code, s.step_no;`;

    const result = await con.query(query, [code]);

    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching material route history", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getAllCurrentMaterialPresenceAtAllLocations = async () => {
  try {
    //----balance logic explanation----
    // const query = `WITH RECURSIVE flat_locations AS (
    //               SELECT code, name, parent_id, type, stack
    //               FROM locations
    //               WHERE parent_id IS NULL

    //               UNION ALL

    //               SELECT l.code, l.name, l.parent_id, l.type, l.stack
    //               FROM locations l
    //               INNER JOIN flat_locations fl ON l.parent_id = fl.code
    //           ),

    //           -- 1️⃣ Latest movement per material
    //           latest_material_location AS (
    //               SELECT DISTINCT ON (material)
    //                   material,
    //                   location AS latest_location,
    //                   moved_at AS latest_moved_at,
    //                   status
    //               FROM material_movements
    //               ORDER BY material, moved_at DESC
    //           ),

    //           -- 2️⃣ Balance logic
    //           balance AS (
    //               SELECT
    //                   mm.material,
    //                   mm.location,
    //                   CASE
    //                       WHEN mm.location = lml.latest_location THEN 1
    //                       ELSE 0
    //                   END AS balance,
    //                   lml.status,
    //                   lml.latest_moved_at
    //               FROM material_movements mm
    //               LEFT JOIN latest_material_location lml
    //                   ON mm.material = lml.material
    //           )

    //           SELECT
    //               fl.code AS code,
    //               fl.name AS name,
    //               fl.type,
    //               fl.stack,
    //               fl.parent_id,

    //               b.material AS material_code,
    //               m.name AS material_name,
    //               b.balance AS quantity,
    //               b.status,
    //               b.latest_moved_at

    //           FROM flat_locations fl
    //           LEFT JOIN balance b
    //               ON fl.code = b.location
    //           LEFT JOIN materials m
    //               ON b.material = m.code

    //           ORDER BY fl.code, b.material`;

    //----simplified version without balance logic (just latest movement at each location)---
    // const query = `WITH RECURSIVE flat_locations AS (
    //                 SELECT code, name, parent_id, type, stack
    //                 FROM locations
    //                 WHERE parent_id IS NULL

    //                 UNION ALL

    //                 SELECT l.code, l.name, l.parent_id, l.type, l.stack
    //                 FROM locations l
    //                 INNER JOIN flat_locations fl ON l.parent_id = fl.code
    //             ),

    //             -- 1️⃣ Latest movement per material
    //             latest_material_location AS (
    //                 SELECT DISTINCT ON (material)
    //                     material,
    //                     location AS latest_location,
    //                     moved_at AS latest_moved_at,
    //                     status
    //                 FROM material_movements
    //                 ORDER BY material, moved_at DESC
    //             )

    //             SELECT
    //                 fl.code,
    //                 fl.name,
    //                 fl.type,
    //                 fl.stack,
    //                 fl.parent_id,

    //                 lml.material AS material_code,
    //                 m.name AS material_name,

    //                 CASE WHEN lml.latest_location = fl.code THEN 1 ELSE NULL END AS quantity,
    //                 lml.status,
    //                 lml.latest_moved_at

    //             FROM flat_locations fl
    //             LEFT JOIN latest_material_location lml
    //                 ON fl.code = lml.latest_location   -- ⬅ FIX: join only latest movement
    //             LEFT JOIN materials m
    //                 ON lml.material = m.code

    //             ORDER BY fl.code`;

    //----with previous location info for in-transit materials---
    // const query = `WITH RECURSIVE flat_locations AS (
    //               SELECT code, name, parent_id, type, stack
    //               FROM locations
    //               WHERE parent_id IS NULL

    //               UNION ALL

    //               SELECT l.code, l.name, l.parent_id, l.type, l.stack
    //               FROM locations l
    //               INNER JOIN flat_locations fl ON l.parent_id = fl.code
    //           ),

    //           -- 1️⃣ Latest movement per material
    //           latest_movement AS (
    //               SELECT DISTINCT ON (material)
    //                   material,
    //                   location AS latest_location,
    //                   moved_at AS latest_moved_at,
    //                   status AS latest_status
    //               FROM material_movements
    //               ORDER BY material, moved_at DESC
    //           ),

    //           -- 2️⃣ Previous movement per material
    //           previous_movement AS (
    //               SELECT DISTINCT ON (mm.material)
    //                   mm.material,
    //                   mm.location AS previous_location,
    //                   mm.moved_at AS previous_moved_at
    //               FROM material_movements mm
    //               JOIN latest_movement lm
    //                 ON mm.material = lm.material
    //               AND mm.moved_at < lm.latest_moved_at
    //               ORDER BY mm.material, mm.moved_at DESC
    //           )

    //           SELECT
    //               fl.code,
    //               fl.name,
    //               fl.type,
    //               fl.stack,
    //               fl.parent_id,
    //               lm.material AS material_code,
    //               m.name AS material_name,
    //               CASE
    //                   WHEN lm.latest_location = fl.code THEN 1
    //                   ELSE 0
    //               END AS quantity,
    //               lm.latest_status AS status,
    //               lm.latest_moved_at,
    //               pm.previous_location
    //           FROM flat_locations fl
    //           LEFT JOIN latest_movement lm
    //               ON lm.latest_location = fl.code   -- only join latest location
    //           LEFT JOIN previous_movement pm
    //               ON pm.material = lm.material      -- bring previous location
    //           LEFT JOIN materials m
    //               ON m.code = lm.material
    //           ORDER BY fl.code`;

    //multi material at same location (quantity) + previous location for in-transit + balance logic
    const query = `WITH RECURSIVE flat_locations AS (
                  SELECT location_id,code, name, parent_id, type, stack, attributes
                  FROM locations
                  WHERE parent_id IS NULL
                  UNION ALL
                  SELECT l.location_id,l.code, l.name, l.parent_id, l.type, l.stack, l.attributes
                  FROM locations l
                  INNER JOIN flat_locations fl ON l.parent_id = fl.code
              ),
              latest_movement AS (
                  SELECT DISTINCT ON (material)
                      material,
                      location AS latest_location,
                      moved_at AS latest_moved_at,
                      status AS latest_status
                  FROM material_movements
                  ORDER BY material, moved_at DESC
              ),
              previous_movement AS (
                  SELECT DISTINCT ON (mm.material)
                      mm.material,
                      mm.location AS previous_location,
                      mm.moved_at AS previous_moved_at
                  FROM material_movements mm
                  JOIN latest_movement lm
                    ON mm.material = lm.material
                  AND mm.moved_at < lm.latest_moved_at
                  ORDER BY mm.material, mm.moved_at DESC
              )

              SELECT
			  	  fl.location_id,
                  fl.code AS code,
                  fl.name AS name,
                  fl.type,
                  fl.stack,
                  fl.parent_id,
                  fl.attributes,
                  lm.material AS material_code,
                  m.name  AS material_name,

                  CASE WHEN lm.latest_location = fl.code THEN 1 ELSE 0 END AS quantity,

                  lm.latest_status AS status,
                  lm.latest_moved_at,
                  pm.previous_location
              FROM flat_locations fl
              LEFT JOIN latest_movement lm
                ON lm.latest_location = fl.code
              LEFT JOIN previous_movement pm
                ON pm.material = lm.material
              LEFT JOIN materials m
                ON m.code = lm.material
              -- Virtual system locations, not places in the warehouse. They are
              -- tree roots with no parent, so without this they render as
              -- top-level siblings of the real warehouse in the Locations tree
              -- and as cards on the dashboard. 'outward' is the pre-002 code for
              -- 'dispatched'; 'loading-area' was 'staging' before 004.
              -- This one filter feeds BOTH the Locations tree and the dashboard
              -- (both call fetchAllCurrentMaterialPresenceAtAllLocations).
              WHERE fl.code not in ('outward', 'dispatched', 'staging', 'loading-area')
              ORDER BY fl.code, lm.material;`;
    const result = await con.query(query);
    const groupedData = groupByLocation(result.rows);
    const tree = buildLocationTree(groupedData);

    return {
      status: 200,
      data: tree,
    };
  } catch (error) {
    console.error("Error Fetching current material presence ", error);
    return { status: 500, message: "Internal server error" };
  }
};

const inTransitMaterialMovements = async (location) => {
  try {
    const query = `
     SELECT m.code,m.attributes,mm.material,mm.location,mm.purpose,mm.status FROM public.material_movements mm join materials m on mm.material = m.name where mm.location = $1 AND mm.status = 'In Transit'
     ORDER BY movement_id ASC `;

    const result = await con.query(query, [location]);
    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Material Movements:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const movedtMaterialMovements = async (location) => {
  try {
    const query = `
            WITH LatestMovements AS (
            SELECT DISTINCT ON (mm.material) 
                mm.material, 
                mm.purpose, 
                mm.location, 
                mm.status,
                mm.movement_id
            FROM public.material_movements mm
            ORDER BY mm.material, mm.movement_id DESC
        )
        SELECT
            m.code,
            m.attributes,
            lm.material,
            lm.location,
            lm.purpose,
            lm.status
        FROM LatestMovements lm
        JOIN materials m ON lm.material = m.name
        WHERE lm.location = $1 AND lm.status != 'In Transit'
          AND lm.purpose NOT IN ('Material Outward', 'Material Out');`;

    const result = await con.query(query, [location]);
    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Material Movements:", error);
    return { status: 500, message: "Internal server error" };
  }
};

// Step-2 outward: list every bag whose LATEST movement sits in the
// 'loading-area' holding area (i.e. Step 1 done, final gate-out pending).
// The device pulls this, scans the physical tags, and submits only the matches
// for final outward. Latest-movement-per-material, so a bag already gated out
// (latest location 'dispatched') drops off automatically.
// 'staging' and 'outward-intransit' are the pre-004 / pre-002 codes, kept here
// as back-compat so rows written before those migrations still surface.
// ponytail: thin alias of movedtMaterialMovements('loading-area');
// exists only to give the app a clearly-named endpoint. Delete if the app
// just calls getMovedMaterialMovements?location=loading-area instead.
const outwardIntransitMovements = async () => {
  try {
    const query = `
      WITH LatestMovements AS (
        SELECT DISTINCT ON (mm.material)
          mm.material, mm.purpose, mm.location, mm.status, mm.movement_id
        FROM public.material_movements mm
        ORDER BY mm.material, mm.movement_id DESC
      )
      SELECT m.code, m.attributes, lm.material, lm.location, lm.purpose, lm.status
      FROM LatestMovements lm
      JOIN materials m ON lm.material = m.name
      WHERE lm.location IN ('loading-area', 'staging', 'outward-intransit');`;

    const result = await con.query(query);
    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Outward-Intransit Movements:", error);
    return { status: 500, message: "Internal server error" };
  }
};

// Reassign a group of in-transit bags from one bin to another (Task 3B
// "location override"). Only the bag's *assigned bin* changes — the row stays
// 'In Transit', so it will surface again when the operator does putaway at the
// new bin and completes there.
//
// All-or-nothing: every bag must currently be 'In Transit' at old_bin. If any
// is not, the whole call is rolled back and nothing changes (spec requirement
// so a group is never left half-reassigned). Runs on a single pooled client so
// BEGIN/UPDATE/COMMIT are guaranteed to share one connection — pool.query()
// would not keep them on the same connection.
//
// NOTE: moved_by is intentionally NOT written here. It has an FK to
// users(user_id); writing an unknown operator id would fail the whole txn, and
// leaving it preserves who did the original inward. operator_id is logged only.
const reassignInTransitBin = async ({ bag_ids, old_bin, new_bin, operator_id }) => {
  const client = await con.pool.connect();
  try {
    const oldClean = old_bin.trim();
    const newClean = new_bin.trim();

    const checkQuery = `
      SELECT movement_id FROM public.material_movements
      WHERE material = $1 AND location = $2 AND status = 'In Transit'
      FOR UPDATE;
    `;
    const updateQuery = `
      UPDATE public.material_movements
      SET location = $3
      WHERE material = $1 AND location = $2 AND status = 'In Transit'
      RETURNING movement_id, material, location, status;
    `;

    await client.query("BEGIN");

    const updated = [];
    const notFound = [];
    for (const raw of bag_ids) {
      const mat = String(raw).trim();
      const found = await client.query(checkQuery, [mat, oldClean]);
      if (found.rows.length === 0) {
        notFound.push(mat);
        continue;
      }
      const upd = await client.query(updateQuery, [mat, oldClean, newClean]);
      updated.push(...upd.rows);
    }

    if (notFound.length > 0) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        message:
          "Reassignment rejected — some bags are no longer 'In Transit' at the old bin. No changes were made.",
        notFound,
      };
    }

    await client.query("COMMIT");
    console.log(
      `Reassigned ${updated.length} bag(s) ${oldClean} -> ${newClean}` +
        (operator_id ? ` by ${operator_id}` : ""),
    );
    return {
      status: 200,
      message: `Reassigned ${updated.length} bag(s) from ${oldClean} to ${newClean}.`,
      data: updated,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    // new_bin (or material) violating its FK to locations/materials surfaces as
    // a clean validation error rather than a generic 500.
    if (error && error.code === "23503") {
      return {
        status: 400,
        message: "Invalid new_bin: not a known location.",
      };
    }
    console.error("Reassign In-Transit Bin Error:", error);
    return { status: 500, message: "Internal server error" };
  } finally {
    client.release();
  }
};

const completeMaterialMovement = async (movement) => {
  try {
    const { material: materialsArray, location } = movement;
    const allUpdatedRows = [];
    const skippedMaterials = [];

    const checkQuery = `
      SELECT movement_id, status 
      FROM public.material_movements 
      WHERE material = $1 AND location = $2 AND status = 'In Transit'
      ORDER BY movement_id ASC
      FOR UPDATE;
    `;

    const updateQuery = `
      UPDATE public.material_movements 
      SET status = 'Moved',
          reached_at = NOW()
      WHERE material = $1 AND location = $2 AND status = 'In Transit'
      RETURNING movement_id, material, location, status, reached_at;
    `;

    for (const singleMaterial of materialsArray) {
      const matClean = singleMaterial.trim();
      const locClean = location.trim();
      const checkResult = await con.query(checkQuery, [matClean, locClean]);
      if (checkResult.rows.length === 0) {
        skippedMaterials.push(matClean);
        continue;
      }
      const updateResult = await con.query(updateQuery, [matClean, locClean]);
      allUpdatedRows.push(...updateResult.rows);
    }

    if (allUpdatedRows.length === 0) {
      return {
        status: 404,
        message:
          "No matching active 'In Transit' materials were found to update.",
        skipped: skippedMaterials,
      };
    }

    return {
      status: 200,
      message:
        skippedMaterials.length > 0
          ? "Processing complete with partial updates (some items skipped)."
          : "All materials for this location successfully updated to 'Moved'.",
      data: allUpdatedRows,
      skipped: skippedMaterials,
    };
  } catch (error) {
    console.error("Error Fetching Material Movements:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const occupancyMaterialDistribution = async () => {
  try {
    // const query = `WITH RECURSIVE flat_locations AS (
    //                 -- Anchor Member
    //                 SELECT
    //                     code,
    //                     name,
    //                     parent_id,
    //                     type,
    //                     stack,
    //                     attributes,
    //                     CAST(attributes ->> 'capacity' AS INTEGER) AS capacity
    //                 FROM locations
    //                 WHERE parent_id IS NULL

    //                 UNION ALL

    //                 -- Recursive Member
    //                 SELECT
    //                     l.code,
    //                     l.name,
    //                     l.parent_id,
    //                     l.type,
    //                     l.stack,
    //                     l.attributes,
    //                     CAST(l.attributes ->> 'capacity' AS INTEGER) AS capacity
    //                 FROM locations l
    //                 INNER JOIN flat_locations fl ON l.parent_id = fl.code
    //             ),

    //             -- 1️⃣ Get the absolute latest tracking state for each individual material
    //             latest_movement AS (
    //                 SELECT DISTINCT ON (material)
    //                     material,
    //                     location AS latest_location,
    //                     moved_at AS latest_moved_at,
    //                     status AS latest_status
    //                 FROM material_movements
    //                 ORDER BY material, moved_at DESC
    //             )

    //             -- 2️⃣ Aggregate everything by location and safely pull from materials master
    //             SELECT
    //                 fl.code AS location_code,
    //                 fl.name AS location_name,
    //                 -- fl.type AS location_type,
    //                 fl.capacity AS total_capacity,
    //                 COUNT(lm.material) AS total_occupied_in_bin,
    //                 fl.capacity - COUNT(lm.material) AS remaining_bin_capacity,

    //                 -- 📦 Material details aggregated into an Array of Objects
    //                 CASE
    //                     WHEN COUNT(lm.material) = 0 THEN '[]'::jsonb
    //                     ELSE jsonb_agg(
    //                         jsonb_build_object(
    //                             'code', m.code,
    //                             'placed_at', lm.latest_moved_at,
    //                             'status', lm.latest_status,

    //                             -- Master data pulled from the 'materials' table
    //                             'name', COALESCE(m.name, 'ERR: Base code ' || SPLIT_PART(lm.material, '_', 1) || ' not found'),
    //                             'attributes', COALESCE(m.attributes, '{}'::jsonb)
    //                         ) ORDER BY lm.material
    //                     )
    //                 END AS occupied_materials

    //             FROM flat_locations fl
    //             LEFT JOIN latest_movement lm
    //                 ON TRIM(CAST(lm.latest_location AS TEXT)) = TRIM(CAST(fl.code AS TEXT))

    //             -- 🛠️ FIXED JOIN: Extracts everything before the "_" from the serialized tag to match the catalog
    //             LEFT JOIN materials m
    //                 ON TRIM(CAST(m.code AS TEXT)) = TRIM(SPLIT_PART(CAST(lm.material AS TEXT), '_', 1))

    //             WHERE fl.type = 'bin'
    //               AND fl.capacity > 0
    //             GROUP BY
    //                 fl.code,
    //                 fl.name,
    //                 fl.type,
    //                 fl.capacity
    //             ORDER BY
    //                 fl.code;`;

    const query = `WITH RECURSIVE flat_locations AS (
                    -- Root locations
                    SELECT
                        code,
                        name,
                        parent_id,
                        type,
                        stack,
                        attributes,
                        COALESCE((attributes ->> 'capacity')::INT, 0) AS capacity
                    FROM locations
                    WHERE parent_id IS NULL

                    UNION ALL

                    -- Child locations
                    SELECT
                        l.code,
                        l.name,
                        l.parent_id,
                        l.type,
                        l.stack,
                        l.attributes,
                        COALESCE((l.attributes ->> 'capacity')::INT, 0) AS capacity
                    FROM locations l
                    INNER JOIN flat_locations fl
                        ON l.parent_id = fl.code
                ),

                -- Latest movement for every material tag
                latest_movement AS (
                    SELECT DISTINCT ON (material)
                        material,
                        location,
                        moved_at,
                        status
                    FROM material_movements
                    ORDER BY material, moved_at DESC
                ),

                -- Remove duplicate material master records
                latest_materials AS (
                    SELECT DISTINCT ON (code)
                        code,
                        name,
                        attributes
                    FROM materials
                    ORDER BY code, created_at DESC
                )

                SELECT
                    fl.code AS location_code,
                    fl.name AS location_name,
                    fl.capacity AS total_capacity,

                    COUNT(lm.material) AS total_occupied_in_bin,

                    GREATEST(
                        fl.capacity - COUNT(lm.material),
                        0
                    ) AS remaining_bin_capacity,

                    CASE
                        WHEN COUNT(lm.material) = 0 THEN '[]'::jsonb

                        ELSE jsonb_agg(
                            jsonb_build_object(
                                'material', lm.material,
                                'code', COALESCE(m.code, SPLIT_PART(lm.material, '_', 1)),
                                'name', COALESCE(
                                    m.name,
                                    'Material Not Found'
                                ),
                                'placed_at', lm.moved_at,
                                'status', lm.status,
                                'attributes', COALESCE(
                                    m.attributes,
                                    '{}'::jsonb
                                )
                            )
                            ORDER BY lm.moved_at DESC
                        )
                    END AS occupied_materials

                FROM flat_locations fl

                LEFT JOIN latest_movement lm
                    ON TRIM(lm.location) = TRIM(fl.code)

                LEFT JOIN latest_materials m
                    ON m.code = SPLIT_PART(lm.material, '_', 1)

                WHERE
                    fl.type = 'bin'
                    AND fl.capacity > 0

                GROUP BY
                    fl.code,
                    fl.name,
                    fl.capacity

                ORDER BY
                    fl.code;`;
    const result = await con.query(query);
    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching occupancy distribution:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const materialPresenceFromToDate = async (fromDate, toDate) => {
  try {
    const query = `
    select m.code,m.attributes,mm.material,mm.location,mm.purpose,
    mm.status,mm.moved_at,m.status
    from material_movements mm JOIN materials m ON m.name = mm.material
    WHERE moved_at >= $1::date AND moved_at < ($2::date + INTERVAL '1 day')`;

    const result = await con.query(query, [fromDate, toDate]);
    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Material Presence Over From To Date:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const materialCurrentLocation = async (materials) => {
  try {
    const query = `
      WITH TargetCodes AS (
          SELECT * FROM (VALUES ${materials?.map((_, i) => `($${i + 1})`).join(', ')}) AS t(code)
      ),
      RankedMovements AS (
          SELECT
              m.code,
              m.attributes,
              mm.location,
              mm.status,
              mm.moved_at,
              ROW_NUMBER() OVER (PARTITION BY m.code ORDER BY mm.moved_at DESC) as rn
          FROM public.material_movements mm
          JOIN materials m ON m.name = mm.material
          WHERE m.code IN (SELECT code FROM TargetCodes)
      )
      SELECT
          tc.code,
          COALESCE(rm.location, 'Not Found') as location,
          rm.status,
          rm.attributes
      FROM TargetCodes tc
      LEFT JOIN RankedMovements rm ON tc.code = rm.code AND rm.rn = 1;
    `;

    // 3. Execute with parameters
    const result = await con.query(query, materials);

    return {
      status: 200,
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Material Current Location : ", error);
    return { status: 500, message: "Internal server error" };
  }
};

module.exports = {
  addNewMaterialMovement,
  getAllMaterialMovements,
  getMaterialMovemntOverTimeThroughLocations,
  getMaterialPresenceAtLocationToday,
  getAverageOfMovementTimePerRoute,
  getAverageOfAllMovementTime,
  getAllMaterialPresenceAtLocationSpecificDate,
  getMaterialRoutingHistoryTillDate,
  getAllCurrentMaterialPresenceAtAllLocations,
  addNewBulkMaterialMovement,
  inTransitMaterialMovements,
  completeMaterialMovement,
  reassignInTransitBin,
  occupancyMaterialDistribution,
  movedtMaterialMovements,
  outwardIntransitMovements,
  materialPresenceFromToDate,
  materialCurrentLocation
};
