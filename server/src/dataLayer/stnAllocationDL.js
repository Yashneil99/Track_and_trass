const con = require("../config/databaseCon");
const { pool } = require("../config/databaseCon");

// --- Consolidation -----------------------------------------------------

// Upserts the consolidated (deduped) rows for an STN. Refuses to overwrite
// an STN that already has submitted bags on any invoice — re-uploading over
// a partially/fully submitted STN would corrupt the running counts.
// (Edge case: "Same STN uploaded twice".)
const upsertConsolidatedStnRows = async (invoiceStn, consolidatedRows) => {
  try {
    const existing = await con.query(
      `SELECT garden_invoice, bags_submitted FROM public.stn_invoice_allocations WHERE invoice_stn = $1`,
      [invoiceStn],
    );

    const hasSubmissions = existing.rows.some((r) => (r.bags_submitted || 0) > 0);
    if (hasSubmissions) {
      return {
        status: 409,
        message:
          "This STN already has submitted bags against it. Consolidating again would overwrite live data — release the STN first if you need to redo it.",
      };
    }

    if (!consolidatedRows.length) {
      return { status: 400, message: "No valid rows found to consolidate" };
    }

    await con.query("BEGIN");

    const upserted = [];
    for (const row of consolidatedRows) {
      const result = await con.query(
        `INSERT INTO public.stn_invoice_allocations (
           invoice_stn, garden_invoice, garden_name, grade, net_weight, total_bags, row_order
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (invoice_stn, garden_invoice) DO UPDATE SET
           garden_name = EXCLUDED.garden_name,
           grade = EXCLUDED.grade,
           net_weight = EXCLUDED.net_weight,
           total_bags = EXCLUDED.total_bags,
           row_order = EXCLUDED.row_order,
           updated_at = now()
         RETURNING *;`,
        [
          invoiceStn,
          row.garden_invoice,
          row.garden_name,
          row.grade,
          row.net_weight,
          row.total_bags,
          row.row_order,
        ],
      );
      upserted.push(result.rows[0]);
    }

    await con.query("COMMIT");

    return {
      status: 200,
      message: "STN consolidated successfully",
      data: upserted.sort((a, b) => a.row_order - b.row_order),
    };
  } catch (error) {
    await con.query("ROLLBACK");
    console.error("Error consolidating STN rows:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getConsolidatedStnRows = async (invoiceStn) => {
  try {
    const result = await con.query(
      `SELECT * FROM public.stn_invoice_allocations WHERE invoice_stn = $1 ORDER BY row_order ASC`,
      [invoiceStn],
    );
    return { status: 200, message: "Allocations fetched successfully", data: result.rows };
  } catch (error) {
    console.error("Error fetching consolidated STN rows:", error);
    return { status: 500, message: "Internal server error" };
  }
};

// --- Assign Location (first-fit allocation algorithm) ------------------

const allocateStnBins = async (invoiceStn) => {
  const client = await pool.connect();
  try {
    const rowsResult = await client.query(
      `SELECT * FROM public.stn_invoice_allocations WHERE invoice_stn = $1 ORDER BY row_order ASC`,
      [invoiceStn],
    );

    if (rowsResult.rows.length === 0) {
      return { status: 400, message: "Consolidate this STN before assigning locations" };
    }

    const pendingRows = rowsResult.rows.filter((r) => !r.allocated_location);
    if (pendingRows.length === 0) {
      return {
        status: 200,
        message: "All invoices in this STN are already allocated",
        data: { successful: [], failed: [] },
      };
    }

    await client.query("BEGIN");

    // Lock bin rows for the duration of this allocation so a concurrent
    // Assign on another STN can't double-book the same capacity.
    const binsResult = await client.query(
      `SELECT location_id, code, attributes, reserved
       FROM public.locations
       WHERE type = 'bin' AND (attributes->>'capacity') IS NOT NULL
       ORDER BY code ASC
       FOR UPDATE`,
    );

    // Occupied = bags physically in the bin right now, per latest movement
    // per material (same definition as binLocationsWithOccupancyAvailability).
    const occupiedResult = await client.query(
      `SELECT lm.latest_location AS location, COUNT(*)::int AS occupied
       FROM (
         SELECT DISTINCT ON (material) material, location AS latest_location
         FROM public.material_movements
         ORDER BY material, moved_at DESC
       ) lm
       GROUP BY lm.latest_location`,
    );
    const occupiedByCode = new Map(occupiedResult.rows.map((r) => [r.location, r.occupied]));

    const workingBins = binsResult.rows.map((b) => {
      const capacity = parseInt(b.attributes?.capacity, 10) || 0;
      const occupied = occupiedByCode.get(b.code) || 0;
      const reserved = b.reserved || 0;
      return {
        location_id: b.location_id,
        code: b.code,
        capacity,
        occupied,
        reserved,
        available: capacity - occupied - reserved,
        dirty: false,
      };
    });

    const successful = [];
    const failed = [];

    for (const row of pendingRows) {
      let assignedBin = null;

      for (const bin of workingBins) {
        if (bin.available >= row.total_bags) {
          assignedBin = bin;
          break;
        }
      }

      if (assignedBin) {
        assignedBin.reserved += row.total_bags;
        assignedBin.available -= row.total_bags;
        assignedBin.dirty = true;
        successful.push({
          allocation_id: row.allocation_id,
          garden_invoice: row.garden_invoice,
          total_bags: row.total_bags,
          allocated_location: assignedBin.code,
        });
      } else {
        failed.push({
          allocation_id: row.allocation_id,
          garden_invoice: row.garden_invoice,
          requested: row.total_bags,
          reason: `no bin has enough space for ${row.total_bags} bags`,
        });
      }
    }

    // --- Split-fit fallback ---------------------------------------------
    // Anything first-fit couldn't place in a single bin might still fit if
    // we spread it across several bins that each have some leftover space.
    // Only kicks in when the *combined* leftover across bins covers the
    // full request — we never leave part of an invoice unplaced.
    const stillFailed = [];
    for (const row of failed) {
      const totalLeftover = workingBins.reduce(
        (sum, bin) => sum + Math.max(bin.available, 0),
        0,
      );

      if (totalLeftover < row.requested) {
        stillFailed.push(row);
        continue;
      }

      let remaining = row.requested;
      const splits = [];

      for (const bin of workingBins) {
        if (remaining <= 0) break;
        if (bin.available <= 0) continue;

        const take = Math.min(bin.available, remaining);
        splits.push({ code: bin.code, location_id: bin.location_id, bags: take });

        bin.reserved += take;
        bin.available -= take;
        bin.dirty = true;
        remaining -= take;
      }

      successful.push({
        allocation_id: row.allocation_id,
        garden_invoice: row.garden_invoice,
        total_bags: row.requested,
        allocated_location: "SPLIT",
        splits,
      });
    }
    failed.length = 0;
    failed.push(...stillFailed);

    for (const bin of workingBins) {
      if (!bin.dirty) continue;
      await client.query(
        `UPDATE public.locations SET reserved = $1 WHERE location_id = $2`,
        [bin.reserved, bin.location_id],
      );
    }

    for (const s of successful) {
      await client.query(
        `UPDATE public.stn_invoice_allocations
         SET allocated_location = $1, updated_at = now()
         WHERE allocation_id = $2`,
        [s.allocated_location, s.allocation_id],
      );

      if (s.allocated_location === "SPLIT") {
        for (const split of s.splits) {
          await client.query(
            `INSERT INTO public.stn_invoice_allocation_splits
               (allocation_id, location_code, bags)
             VALUES ($1, $2, $3)`,
            [s.allocation_id, split.code, split.bags],
          );
        }
      }
    }

    await client.query("COMMIT");

    return {
      status: 200,
      message:
        failed.length === 0
          ? "All invoices allocated successfully"
          : `${successful.length} invoice(s) allocated, ${failed.length} could not be placed`,
      data: { successful, failed },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error allocating STN bins:", error);
    return { status: 500, message: "Internal server error" };
  } finally {
    client.release();
  }
};

// --- Release Location ----------------------------------------------------

const releaseStnBins = async (invoiceStn) => {
  const client = await pool.connect();
  try {
    const rowsResult = await client.query(
      `SELECT * FROM public.stn_invoice_allocations
       WHERE invoice_stn = $1 AND allocated_location IS NOT NULL`,
      [invoiceStn],
    );

    if (rowsResult.rows.length === 0) {
      return {
        status: 200,
        message: "No allocated invoices to release for this STN",
        data: { released: [] },
      };
    }

    await client.query("BEGIN");

    const splitAllocationIds = rowsResult.rows
      .filter((r) => r.allocated_location === "SPLIT")
      .map((r) => r.allocation_id);

    const splitsByAllocationId = new Map();
    if (splitAllocationIds.length > 0) {
      const splitsResult = await client.query(
        `SELECT * FROM public.stn_invoice_allocation_splits
         WHERE allocation_id = ANY($1) FOR UPDATE`,
        [splitAllocationIds],
      );
      for (const s of splitsResult.rows) {
        if (!splitsByAllocationId.has(s.allocation_id)) {
          splitsByAllocationId.set(s.allocation_id, []);
        }
        splitsByAllocationId.get(s.allocation_id).push(s);
      }
    }

    const binCodes = [
      ...new Set([
        ...rowsResult.rows
          .filter((r) => r.allocated_location !== "SPLIT")
          .map((r) => r.allocated_location),
        ...[...splitsByAllocationId.values()].flat().map((s) => s.location_code),
      ]),
    ];
    const binsResult = await client.query(
      `SELECT location_id, code, reserved FROM public.locations WHERE code = ANY($1) FOR UPDATE`,
      [binCodes],
    );
    const binByCode = new Map(binsResult.rows.map((b) => [b.code, { ...b }]));

    const released = [];

    for (const row of rowsResult.rows) {
      const locationCleared = (row.bags_submitted || 0) === 0;

      if (row.allocated_location === "SPLIT") {
        const splits = splitsByAllocationId.get(row.allocation_id) || [];
        let releasedQty = 0;

        for (const split of splits) {
          const unsubmitted = Math.max(0, split.bags - (split.bags_submitted || 0));
          const bin = binByCode.get(split.location_code);
          if (bin && unsubmitted > 0) {
            bin.reserved = Math.max(0, (bin.reserved || 0) - unsubmitted);
          }
          releasedQty += unsubmitted;
        }

        released.push({
          allocation_id: row.allocation_id,
          garden_invoice: row.garden_invoice,
          released_qty: releasedQty,
          allocated_location: "SPLIT",
          splits: splits.map((s) => s.location_code),
          location_cleared: locationCleared,
        });
        continue;
      }

      const unsubmitted = Math.max(0, row.total_bags - (row.bags_submitted || 0));
      const bin = binByCode.get(row.allocated_location);

      if (bin && unsubmitted > 0) {
        bin.reserved = Math.max(0, (bin.reserved || 0) - unsubmitted);
      }

      released.push({
        allocation_id: row.allocation_id,
        garden_invoice: row.garden_invoice,
        released_qty: unsubmitted,
        allocated_location: row.allocated_location,
        location_cleared: locationCleared,
      });
    }

    for (const bin of binByCode.values()) {
      await client.query(`UPDATE public.locations SET reserved = $1 WHERE location_id = $2`, [
        bin.reserved,
        bin.location_id,
      ]);
    }

    for (const r of released) {
      await client.query(
        `UPDATE public.stn_invoice_allocations
         SET allocated_location = CASE WHEN $1 THEN NULL ELSE allocated_location END,
             updated_at = now()
         WHERE allocation_id = $2`,
        [r.location_cleared, r.allocation_id],
      );

      // Fully-released splits are gone for good; if bags were already
      // submitted against some of them we leave the split rows in place
      // (same convention as the single-bin case keeping allocated_location).
      if (r.location_cleared) {
        await client.query(
          `DELETE FROM public.stn_invoice_allocation_splits WHERE allocation_id = $1`,
          [r.allocation_id],
        );
      }
    }

    await client.query("COMMIT");

    return {
      status: 200,
      message: "Release completed",
      data: { released },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error releasing STN bins:", error);
    return { status: 500, message: "Internal server error" };
  } finally {
    client.release();
  }
};

// --- Android submission increment ---------------------------------------

// Called as bags are physically submitted into their reserved bin. Every bag
// that gets submitted stops being "reserved" and becomes real occupancy
// (tracked separately via material_movements), so this must shrink
// locations.reserved by the same amount it adds to bags_submitted — otherwise
// that capacity stays double-counted (reserved AND occupied) forever.
const incrementBagsSubmitted = async (invoiceStn, gardenInvoice, bags, location) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const rowResult = await client.query(
      `SELECT * FROM public.stn_invoice_allocations
       WHERE invoice_stn = $1 AND garden_invoice = $2
       FOR UPDATE`,
      [invoiceStn, gardenInvoice],
    );

    if (rowResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { status: 404, message: "No matching STN invoice row found" };
    }

    const row = rowResult.rows[0];

    if (!row.allocated_location) {
      await client.query("ROLLBACK");
      return { status: 409, message: "Invoice has no active bin reservation. It may have been released." };
    }

    // A split invoice lives in several bins, so the caller MUST tell us
    // which one these bags physically went into.
    if (row.allocated_location === "SPLIT" && !location) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        message:
          "This invoice's bags were split across multiple bins — specify which bin these bags were submitted to.",
      };
    }

    // If the caller tells us which bin the bags were actually submitted to,
    // make sure it's the bin we reserved — submitting against the wrong bin
    // would silently drain the wrong location's reserved count.
    if (row.allocated_location !== "SPLIT" && location && location !== row.allocated_location) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        message: `Bags were reserved in bin ${row.allocated_location}, not ${location}. Release and re-assign before submitting elsewhere.`,
      };
    }

    let delta;
    let newRowSubmitted;

    if (row.allocated_location === "SPLIT") {
      const splitResult = await client.query(
        `SELECT * FROM public.stn_invoice_allocation_splits
         WHERE allocation_id = $1 AND location_code = $2
         FOR UPDATE`,
        [row.allocation_id, location],
      );

      if (splitResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return {
          status: 409,
          message: `No split reservation for this invoice in bin ${location}.`,
        };
      }

      const split = splitResult.rows[0];
      const previousSplitSubmitted = split.bags_submitted || 0;
      const newSplitSubmitted = Math.min(split.bags, previousSplitSubmitted + bags);
      delta = newSplitSubmitted - previousSplitSubmitted;

      await client.query(
        `UPDATE public.stn_invoice_allocation_splits
         SET bags_submitted = $1, updated_at = now()
         WHERE split_id = $2`,
        [newSplitSubmitted, split.split_id],
      );

      const previousRowSubmitted = row.bags_submitted || 0;
      newRowSubmitted = Math.min(row.total_bags, previousRowSubmitted + delta);

      if (delta > 0) {
        const binResult = await client.query(
          `SELECT location_id, reserved FROM public.locations WHERE code = $1 FOR UPDATE`,
          [location],
        );
        if (binResult.rows.length > 0) {
          const bin = binResult.rows[0];
          const newReserved = Math.max(0, (bin.reserved || 0) - delta);
          await client.query(`UPDATE public.locations SET reserved = $1 WHERE location_id = $2`, [
            newReserved,
            bin.location_id,
          ]);
        }
      }
    } else {
      const previousSubmitted = row.bags_submitted || 0;
      newRowSubmitted = Math.min(row.total_bags, previousSubmitted + bags);
      delta = newRowSubmitted - previousSubmitted;

      if (delta > 0) {
        const binResult = await client.query(
          `SELECT location_id, reserved FROM public.locations WHERE code = $1 FOR UPDATE`,
          [row.allocated_location],
        );

        if (binResult.rows.length > 0) {
          const bin = binResult.rows[0];
          const newReserved = Math.max(0, (bin.reserved || 0) - delta);
          await client.query(`UPDATE public.locations SET reserved = $1 WHERE location_id = $2`, [
            newReserved,
            bin.location_id,
          ]);
        }
      }
    }

    const updateResult = await client.query(
      `UPDATE public.stn_invoice_allocations
       SET bags_submitted = $1, updated_at = now()
       WHERE allocation_id = $2
       RETURNING *;`,
      [newRowSubmitted, row.allocation_id],
    );

    await client.query("COMMIT");

    return {
      status: 200,
      message: newRowSubmitted === row.total_bags ? "Invoice complete" : "Bags submitted updated",
      data: updateResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error incrementing bags submitted:", error);
    return { status: 500, message: "Internal server error" };
  } finally {
    client.release();
  }
};

// Manual override for a single invoice row — used when the first-fit
// algorithm couldn't place it automatically (or the operator just wants to
// pick a specific bin themselves). Same locking discipline as allocateStnBins:
// the target bin row is locked for the duration of the check-and-reserve so
// a concurrent Assign/manual-assign on the same bin can't race past it.
const manualAssignStnBin = async (invoiceStn, gardenInvoice, locationCode, force = false) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const rowResult = await client.query(
      `SELECT * FROM public.stn_invoice_allocations
       WHERE invoice_stn = $1 AND garden_invoice = $2
       FOR UPDATE`,
      [invoiceStn, gardenInvoice],
    );

    if (rowResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { status: 404, message: "No matching STN invoice row found" };
    }

    const row = rowResult.rows[0];

    if (row.allocated_location) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        message: `This invoice is already allocated to bin ${row.allocated_location}. Release it first if you want to move it.`,
      };
    }

    const binResult = await client.query(
      `SELECT location_id, code, attributes, reserved
       FROM public.locations
       WHERE code = $1 AND type = 'bin'
       FOR UPDATE`,
      [locationCode],
    );

    if (binResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { status: 404, message: `Bin ${locationCode} was not found` };
    }

    const bin = binResult.rows[0];
    const capacity = parseInt(bin.attributes?.capacity, 10) || 0;

    const occupiedResult = await client.query(
      `SELECT COUNT(*)::int AS occupied
       FROM (
         SELECT DISTINCT ON (material) material, location AS latest_location
         FROM public.material_movements
         ORDER BY material, moved_at DESC
       ) lm
       WHERE lm.latest_location = $1`,
      [locationCode],
    );
    const occupied = occupiedResult.rows[0]?.occupied || 0;
    const reserved = bin.reserved || 0;
    const available = capacity - occupied - reserved;

    // Not enough room. Report it as a 409 with the shortfall so the caller
    // can ask "assign anyway?" — but only actually block the write if the
    // operator hasn't already confirmed the override (force=true).
    if (available < row.total_bags && !force) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        message: `Bin ${locationCode} only has ${available} of ${row.total_bags} bags of space free`,
        data: { available, requested: row.total_bags, insufficientCapacity: true },
      };
    }

    await client.query(`UPDATE public.locations SET reserved = $1 WHERE location_id = $2`, [
      reserved + row.total_bags,
      bin.location_id,
    ]);

    const updateResult = await client.query(
      `UPDATE public.stn_invoice_allocations
       SET allocated_location = $1, updated_at = now()
       WHERE allocation_id = $2
       RETURNING *;`,
      [locationCode, row.allocation_id],
    );

    await client.query("COMMIT");

    const overbooked = available < row.total_bags;

    return {
      status: 200,
      message: overbooked
        ? `Invoice manually assigned to bin ${locationCode} (overbooked by ${row.total_bags - available} bags — confirmed by operator)`
        : `Invoice manually assigned to bin ${locationCode}`,
      data: updateResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error manually assigning STN bin:", error);
    return { status: 500, message: "Internal server error" };
  } finally {
    client.release();
  }
};

// --- Relocate an already-allocated invoice ------------------------------

// Moves ONE invoice line of an STN from the bin it is allocated to, to another
// bin — the operation the Putaway handheld performs when it finds an invoice
// heading for a bin that can't take it.
//
// An invoice of N bags always occupies exactly N of its bin's capacity: the
// bags that have been inwarded sit in `occupied` (a material_movements row
// pointing at the bin), and the ones still on the truck sit in
// `locations.reserved`. Every inward moves one bag from the second column to
// the first (see incrementBagsSubmitted) and the total never changes.
//
// So relocating has to move BOTH columns, or the accounting rots:
//   - the In-Transit movement rows  → the bags that are physically here
//   - the reservation + allocated_location → the bags that haven't arrived yet
//
// Moving only the movement rows (which is all the old changeAssignedBin did)
// leaves the source bin reserved for bags that are never coming, over-commits
// the target bin, and — because inward stamps bins from allocated_location —
// keeps routing the rest of the truck to the bin we just walked away from.
//
// Refuses outright if any bag of the invoice is already put away in the source
// bin: the rest must follow it, or one invoice ends up split across two bins.
// The handheld enforces this too, but it is the server's rule to keep.
const relocateStnInvoice = async (invoiceStn, gardenInvoice, newLocation, operatorId, force = false) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const rowResult = await client.query(
      `SELECT * FROM public.stn_invoice_allocations
       WHERE invoice_stn = $1 AND garden_invoice = $2
       FOR UPDATE`,
      [invoiceStn, gardenInvoice],
    );

    if (rowResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { status: 404, message: "No matching STN invoice row found" };
    }

    const row = rowResult.rows[0];
    const oldLocation = row.allocated_location;

    if (!oldLocation) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        message: "This invoice has no bin allocated, so there is nothing to move. Assign it a bin first.",
      };
    }

    // A split invoice's reservation lives in several bins at once, so "where is it
    // now" is a list, not a column: allocated_location reads the literal 'SPLIT'
    // and the per-bin breakdown lives in stn_invoice_allocation_splits. Collapsing
    // it onto the one bin the operator picked IS the move — the split rows go away
    // and the invoice comes out single-binned like every other one. Nothing
    // downstream understands 'SPLIT' as a location (drawDownReservations compares
    // it against a real bin code and skips), so a split invoice stays broken until
    // something collapses it.
    const isSplit = oldLocation === "SPLIT";
    const splits = isSplit
      ? (
          await client.query(
            `SELECT location_code, bags, bags_submitted
             FROM public.stn_invoice_allocation_splits
             WHERE allocation_id = $1
             FOR UPDATE`,
            [row.allocation_id],
          )
        ).rows
      : [];

    if (isSplit && splits.length === 0) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        message:
          "This invoice is marked SPLIT but has no per-bin breakdown, so there is nothing to move. Release and re-assign it.",
      };
    }

    // Every bin holding part of this invoice's reservation, and how much of it —
    // one entry for a normal invoice, one per bin for a split one. Everything
    // below works off this list, so both cases take the same path.
    const sources = isSplit
      ? splits.map((s) => ({
          code: s.location_code,
          outstanding: Math.max(0, s.bags - (s.bags_submitted || 0)),
        }))
      : [
          {
            code: oldLocation,
            outstanding: Math.max(0, row.total_bags - (row.bags_submitted || 0)),
          },
        ];

    const sourceCodes = sources.map((s) => s.code);

    // Only a no-op when the invoice is ALREADY entirely in the target. A split that
    // merely includes the target still has bags in other bins to pull in.
    if (sourceCodes.length === 1 && sourceCodes[0] === newLocation) {
      await client.query("ROLLBACK");
      return { status: 400, message: `This invoice is already allocated to ${newLocation}.` };
    }

    // The invoice's bags. `materials.name` is <EPC>_<STN>_<DATETIME>, so the STN
    // is the second segment; the garden invoice lives in the attributes blob.
    const invoiceBagsSql = `
      SELECT m.name
      FROM public.materials m
      WHERE m.attributes->>'Garden Inv No' = $1
        AND split_part(m.name, '_', 2) = $2`;

    // Anything of this invoice already put away pins it where it stands: the bags
    // are physically in that bin, and moving the record would only make it lie
    // about them. "Put away" = latest movement is at the bin and is no longer In
    // Transit. Checked across every source bin, because a split invoice has more
    // than one — the old single-bin check ran against the literal 'SPLIT', matched
    // nothing, and so passed unconditionally for exactly the rows that needed it.
    // Bags already put away in the TARGET don't block: that is where they are going.
    const placedResult = await client.query(
      `SELECT lm.location, COUNT(*)::int AS placed
       FROM (
         SELECT DISTINCT ON (mm.material) mm.material, mm.location, mm.status
         FROM public.material_movements mm
         WHERE mm.material IN (${invoiceBagsSql})
         ORDER BY mm.material, mm.movement_id DESC
       ) lm
       WHERE lm.location = ANY($3) AND lm.location <> $4 AND lm.status <> 'In Transit'
       GROUP BY lm.location`,
      [gardenInvoice, invoiceStn, sourceCodes, newLocation],
    );

    if (placedResult.rows.length > 0) {
      await client.query("ROLLBACK");
      const placed = placedResult.rows.reduce((sum, r) => sum + r.placed, 0);
      const where = placedResult.rows.map((r) => `${r.location} (${r.placed})`).join(", ");
      return {
        status: 409,
        message: `${placed} bag(s) of this invoice are already put away in ${where}. The rest must go to the same bin.`,
        data: { placed, allocated_location: oldLocation, placed_in: placedResult.rows },
      };
    }

    // Lock every bin involved for the check-and-move, same discipline as
    // allocateStnBins.
    const binsResult = await client.query(
      `SELECT location_id, code, attributes, reserved
       FROM public.locations
       WHERE code = ANY($1) AND type = 'bin'
       FOR UPDATE`,
      [[...new Set([...sourceCodes, newLocation])]],
    );

    const binByCode = new Map(binsResult.rows.map((b) => [b.code, b]));
    const targetBin = binByCode.get(newLocation);

    if (!targetBin) {
      await client.query("ROLLBACK");
      return { status: 404, message: `Bin ${newLocation} was not found` };
    }

    // Capacity in the target is measured against the FULL invoice — not the bags
    // that happen to have arrived — because the whole N-bag footprint lands
    // there: the inwarded bags as occupancy, the rest as reservation. Sizing on
    // the inward count would let us pick a bin that fits today's 5 bags and
    // over-commit it by the 14 still on the truck.
    //
    // Measured with this invoice's OWN footprint at the target excluded, because
    // that footprint is released and re-added as part of the full N below. It
    // matters when collapsing a split onto one of its own bins — the common case,
    // since the operator is standing at one: the bin's `reserved` already counts
    // this invoice's share, and charging N against a number that already includes
    // it refuses a move that fits exactly. For a normal invoice the target is a
    // different bin, so it has no footprint there and this reads as it always did.
    const capacity = parseInt(targetBin.attributes?.capacity, 10) || 0;
    const occupiedResult = await client.query(
      `SELECT COUNT(*)::int AS occupied
       FROM (
         SELECT DISTINCT ON (material) material, location AS latest_location
         FROM public.material_movements
         ORDER BY material, moved_at DESC
       ) lm
       WHERE lm.latest_location = $3
         AND lm.material NOT IN (${invoiceBagsSql})`,
      [gardenInvoice, invoiceStn, newLocation],
    );
    const occupied = occupiedResult.rows[0]?.occupied || 0;
    const ownReservedAtTarget = sources.find((s) => s.code === newLocation)?.outstanding || 0;
    const available = capacity - occupied - ((targetBin.reserved || 0) - ownReservedAtTarget);

    if (available < row.total_bags && !force) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        message: `Bin ${newLocation} has room for ${available} of this invoice's ${row.total_bags} bags`,
        data: { available, requested: row.total_bags, insufficientCapacity: true },
      };
    }

    // The reservation still held for bags that have not been inwarded yet. It is
    // what follows the invoice to the new bin; the already-inwarded bags travel
    // as movement rows instead, and their occupancy moves with them. Summed across
    // every source bin, so a split invoice moves its whole outstanding balance.
    const outstanding = sources.reduce((sum, s) => sum + s.outstanding, 0);

    for (const s of sources) {
      // The target's own share is folded into the single write below rather than
      // released here, so the bin isn't updated twice in one transaction.
      if (s.code === newLocation) continue;
      const sourceBin = binByCode.get(s.code);
      if (sourceBin && s.outstanding > 0) {
        await client.query(`UPDATE public.locations SET reserved = $1 WHERE location_id = $2`, [
          Math.max(0, (sourceBin.reserved || 0) - s.outstanding),
          sourceBin.location_id,
        ]);
      }
    }

    await client.query(`UPDATE public.locations SET reserved = $1 WHERE location_id = $2`, [
      Math.max(0, (targetBin.reserved || 0) - ownReservedAtTarget) + outstanding,
      targetBin.location_id,
    ]);

    const movedResult = await client.query(
      `UPDATE public.material_movements
       SET location = $3
       WHERE status = 'In Transit'
         AND location = ANY($4)
         AND location <> $3
         AND material IN (${invoiceBagsSql})
       RETURNING material`,
      [gardenInvoice, invoiceStn, newLocation, sourceCodes],
    );

    // The invoice is single-binned again, so the breakdown that said otherwise has
    // to go with it — left behind, it would point at bins the invoice no longer
    // reserves and releaseStnBins would refund capacity twice.
    if (isSplit) {
      await client.query(
        `DELETE FROM public.stn_invoice_allocation_splits WHERE allocation_id = $1`,
        [row.allocation_id],
      );
    }

    const updateResult = await client.query(
      `UPDATE public.stn_invoice_allocations
       SET allocated_location = $1, updated_at = now()
       WHERE allocation_id = $2
       RETURNING *;`,
      [newLocation, row.allocation_id],
    );

    await client.query("COMMIT");

    const overbooked = available < row.total_bags;
    const from = sourceCodes.join(", ");
    console.log(
      `Relocated STN ${invoiceStn} invoice ${gardenInvoice}: ${from} -> ${newLocation} ` +
        `(${movedResult.rowCount} in-transit bag(s), ${outstanding} reserved` +
        (isSplit ? `, collapsed ${splits.length}-bin split` : "") +
        ")" +
        (operatorId ? ` by ${operatorId}` : ""),
    );

    return {
      status: 200,
      message: overbooked
        ? `Invoice moved to ${newLocation} (overbooked by ${row.total_bags - available} bags — confirmed by operator)`
        : `Invoice moved to ${newLocation}`,
      data: {
        ...updateResult.rows[0],
        // The bins it actually came from — 'SPLIT' is a marker, not somewhere a
        // caller can route back to.
        previous_location: from,
        split_collapsed: isSplit,
        bags_relocated: movedResult.rowCount,
        reservation_moved: outstanding,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error relocating STN invoice:", error);
    return { status: 500, message: "Internal server error" };
  } finally {
    client.release();
  }
};

// Actual bags physically inwarded per garden invoice for an STN — the UNCAPPED
// count (one materials row per submitted bag), unlike stn_invoice_allocations.
// bags_submitted, which the reservation draw-down caps at the invoice's planned
// total. The STN feed sends this so the handheld can show an over-scanned invoice
// as e.g. 18/17 (and keep it after a reload) instead of healing back to the
// capped 17. A bag's STN is the 2nd '_'-segment of its material name — the same
// convention relocateStnInvoice already relies on.
const getInwardedCountsByStn = async (invoiceStn) => {
  try {
    const result = await con.query(
      `SELECT m.attributes->>'Garden Inv No' AS garden_invoice,
              COUNT(*)::int AS inwarded
       FROM public.materials m
       WHERE split_part(m.name, '_', 2) = $1
         AND m.attributes->>'Garden Inv No' IS NOT NULL
       GROUP BY m.attributes->>'Garden Inv No'`,
      [invoiceStn],
    );
    return { status: 200, data: result.rows };
  } catch (error) {
    console.error("Error fetching inwarded counts:", error);
    return { status: 500, message: "Internal server error", data: [] };
  }
};

module.exports = {
  upsertConsolidatedStnRows,
  getConsolidatedStnRows,
  getInwardedCountsByStn,
  allocateStnBins,
  releaseStnBins,
  incrementBagsSubmitted,
  manualAssignStnBin,
  relocateStnInvoice,
};
