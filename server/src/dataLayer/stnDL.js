const con = require("../config/databaseCon");
const { addNewAudit } = require("./auditDL");
const { releaseStnBins } = require("./stnAllocationDL");

const uploadStnDocument = async (file_name, file_path, invoice_stn) => {
  try {
    const query = `
      INSERT INTO public.documents (
        file_path,
        file_name,
        invoice_stn
      ) VALUES ($1, $2, $3)
      RETURNING *;`;

    const values = [file_path, file_name, invoice_stn];

    const result = await con.query(query, values);

    return {
      status: 201,
      message: "STN document uploaded successfully",
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Error Uploading STN Document:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getStnDocumentsByFileName = async (file_name) => {
  try {
    const query = `
      SELECT d.*
      FROM public.documents d
      WHERE d.file_name = $1
      ORDER BY d.uploaded_at DESC`;

    const values = [file_name];
    const result = await con.query(query, values);

    return {
      status: 200,
      message: "Documents retrieved successfully",
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Documents:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getStnDocumentsByInvoice = async (invoice_stn) => {
  try {
    const query = `
      SELECT d.*
      FROM public.documents d
      WHERE d.invoice_stn = $1
      ORDER BY d.uploaded_at DESC`;

    const values = [invoice_stn];
    const result = await con.query(query, values);

    return {
      status: 200,
      message: "Documents retrieved successfully",
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Documents:", error);
    return { status: 500, message: "Internal server error" };
  }
};

// An STN is not just its document row. Deleting only the document used to strand
// everything else: the consolidated rows stayed, and with them locations.reserved
// — capacity held for bags that were never coming, with the Release Bin button
// (rendered per document) gone along with the row. The handheld kept inwarding
// against the invisible STN because the inward path joins stn_invoice_allocations
// by invoice_stn, never documents. So delete the whole STN, or refuse.
const deleteStnDocument = async (documentId) => {
  try {
    const getQuery = "SELECT * FROM public.documents WHERE document_id = $1";
    const getResult = await con.query(getQuery, [documentId]);

    if (getResult.rowCount === 0) {
      return { status: 404, message: "Document not found" };
    }

    const document = getResult.rows[0];

    // Bags already put away are live inventory, not a document — their movement
    // rows would outlive the invoice that explains them. Same guard, and the
    // same instruction to the operator, as upsertConsolidatedStnRows.
    const submittedResult = await con.query(
      `SELECT COALESCE(SUM(bags_submitted), 0)::int AS submitted
       FROM public.stn_invoice_allocations WHERE invoice_stn = $1`,
      [document.invoice_stn],
    );

    if (submittedResult.rows[0].submitted > 0) {
      return {
        status: 409,
        message:
          "This STN already has bags submitted into bins. Release the STN first if you need to delete it.",
      };
    }

    // Hands back locations.reserved and drops the split rows. With no bags
    // submitted it clears every allocation cleanly; on a never-assigned STN it
    // is a 200 no-op, so this needs no branch.
    const release = await releaseStnBins(document.invoice_stn);
    if (release.status !== 200) {
      return release;
    }

    // Splits cascade off allocation_id (003_stn_split_allocation.sql).
    await con.query(
      "DELETE FROM public.stn_invoice_allocations WHERE invoice_stn = $1",
      [document.invoice_stn],
    );

    const deleteQuery = "DELETE FROM public.documents WHERE document_id = $1";
    const deleteResult = await con.query(deleteQuery, [documentId]);

    if (deleteResult.rowCount > 0) {
      return {
        status: 200,
        message: "STN deleted and its bins released",
        data: document,
      };
    }
  } catch (error) {
    console.error("Error Deleting STN Document:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const getStnDocuments = async () => {
  try {
    const query = "SELECT * FROM public.documents ORDER BY uploaded_at DESC";
    const result = await con.query(query);

    if (result.rowCount === 0) {
      return { status: 404, message: "Document not found", data: null };
    }

    return {
      status: 200,
      message: "Document retrieved successfully",
      data: result.rows,
    };
  } catch (error) {
    console.error("Error Fetching Document By ID:", error);
    return { status: 500, message: "Internal server error" };
  }
};

const stnStatusUpdateAudit = async (invoice_stn, status, summary) => {
  try {
    const checkQuery = `
      SELECT * 
      FROM documents 
      WHERE invoice_stn = $1;
    `;

    const existingRecord = await con.query(checkQuery, [invoice_stn]);

    if (existingRecord.rows.length === 0) {
      return {
        status: 404,
        message: `STN with invoice reference ${invoice_stn} not found.`,
      };
    }

    const currentRecord = existingRecord.rows[0];
    if (currentRecord.status === status) {
      return {
        status: 200,
        message: `STN is already in '${status}' status. No update required.`,
        data: currentRecord,
      };
    }

    const updateQuery = `
      UPDATE documents
      SET 
        status = $1,
        summary = $2,
        updated_at = NOW()
      WHERE invoice_stn = $3
      RETURNING invoice_stn, status, summary, updated_at;
    `;

    const updatedRecord = await con.query(updateQuery, [
      status,
      summary,
      invoice_stn,
    ]);

    return {
      status: 200,
      message: "STN status updated and audited successfully.",
      data: updatedRecord.rows[0],
    };
  } catch (error) {
    console.error(
      `Error in stnStatusUpdateAudit for STN ${invoice_stn}:`,
      error.message,
    );

    return {
      status: 500,
      message: "Internal server error",
      error: error.message || "Internal database operational failure.",
    };
  }
};

const getAllocatedLocations = async (invoice_stn) => {
  const query = `SELECT allocation_id, garden_invoice, garden_name, grade, allocated_location
                 FROM stn_invoice_allocations WHERE invoice_stn = $1 and allocated_location IS NOT NULL`;
  const result = await con.query(query, [invoice_stn]);
  if (result.rows.length === 0) {
    return {
      status: 404,
      message: `STN Allocated Locations ${invoice_stn} not found.`,
    };
  }

  // Garden invoices that couldn't fit in a single bin are marked 'SPLIT';
  // attach their per-bin breakdown so the caller (Android inward flow)
  // knows which bins to actually submit bags into.
  const splitAllocationIds = result.rows
    .filter((r) => r.allocated_location === "SPLIT")
    .map((r) => r.allocation_id);

  let splitsByAllocationId = new Map();
  if (splitAllocationIds.length > 0) {
    // ORDER BY is load-bearing, not tidiness. The caller renders these into one
    // "bin:bags, bin:bags" string and the handheld fills the bins left to right,
    // so the order decides which bag goes where. Unordered, the order is just the
    // heap's: drawing down a slice UPDATEs the row, which moves it to the end of
    // the scan, so the string silently re-orders itself as bags arrive and the
    // handheld starts routing the rest of the invoice into a bin already full.
    // location_code reproduces the order allocateStnBins created them in (it walks
    // bins ORDER BY code ASC), so what the operator sees never shifts under them.
    const splitsResult = await con.query(
      `SELECT allocation_id, location_code, bags, bags_submitted
       FROM stn_invoice_allocation_splits
       WHERE allocation_id = ANY($1)
       ORDER BY location_code ASC`,
      [splitAllocationIds],
    );
    splitsByAllocationId = splitsResult.rows.reduce((map, s) => {
      if (!map.has(s.allocation_id)) map.set(s.allocation_id, []);
      map.get(s.allocation_id).push({
        location_code: s.location_code,
        bags: s.bags,
        bags_submitted: s.bags_submitted,
      });
      return map;
    }, new Map());
  }

  const data = result.rows.map((row) => ({
    ...row,
    splits:
      row.allocated_location === "SPLIT"
        ? splitsByAllocationId.get(row.allocation_id) || []
        : undefined,
  }));

  return {
    status: 200,
    message: "STN Allocated Locations retrieved successfully.",
    data,
  };
};

module.exports = {
  uploadStnDocument,
  getStnDocumentsByFileName,
  deleteStnDocument,
  getStnDocuments,
  getStnDocumentsByInvoice,
  stnStatusUpdateAudit,
  getAllocatedLocations,
};
