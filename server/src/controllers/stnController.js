const {
  uploadStnDocument,
  getStnDocumentsByFileName,
  deleteStnDocument,
  getStnDocuments,
  getStnDocumentsByInvoice,
  stnStatusUpdateAudit,
  getAllocatedLocations,
} = require("../dataLayer/stnDL");
const {
  upsertConsolidatedStnRows,
  getConsolidatedStnRows,
  getInwardedCountsByStn,
  allocateStnBins,
  releaseStnBins,
  incrementBagsSubmitted,
  manualAssignStnBin,
  relocateStnInvoice,
} = require("../dataLayer/stnAllocationDL");
const {
  resolveStnFilePath,
  parseStnWorkbookRows,
  consolidateStnRows,
} = require("../utils/stnExcelParser");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const XLSX = require("xlsx");

// Multer has already written the file by the time the controller validates it,
// so a rejected upload leaves an orphan on disk unless we clean up.
const discardUpload = (file) => {
  fs.unlink(file.path, (err) => {
    if (err) console.error("Failed to remove rejected STN upload:", err);
  });
};

const uploadStn = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No STN file uploaded. Use form-data with key 'stnFile'.",
      });
    }

    if (
      req.file.mimetype !== "application/pdf" &&
      req.file.mimetype !== "application/octet-stream" &&
      req.file.mimetype !== "application/vnd.ms-excel" &&
      req.file.mimetype !==
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      discardUpload(req.file);
      return res
        .status(400)
        .json({ message: "Only PDF files are allowed for STN documents" });
    }

    // Everything downstream (consolidate, allocate, release, delete) keys off
    // invoice_stn. A row without one is unreachable garbage that still holds a
    // file on disk, so reject before the insert, not after.
    const { invoice_stn } = req.body;
    if (!invoice_stn || typeof invoice_stn !== "string" || !invoice_stn.trim()) {
      discardUpload(req.file);
      return res
        .status(400)
        .json({ status: 400, message: "Invoice STN is required" });
    }

    // Refuse a file we already have on record. Nothing at the DB level stops a
    // second documents row for the same physical file — which is how one
    // spreadsheet ended up stored twice under two different STNs — so guard it
    // here and tell the operator to stop before we write another orphan.
    const existing = await getStnDocumentsByFileName(req.file.originalname);
    if (existing.status === 200 && existing.data && existing.data.length > 0) {
      discardUpload(req.file);
      return res.status(409).json({
        status: 409,
        message: `A file named "${req.file.originalname}" has already been uploaded (STN ${existing.data[0].invoice_stn}). Rename the file, or delete the existing STN, before uploading it again.`,
      });
    }

    const result = await uploadStnDocument(
      req.file.originalname,
      `/uploads/stn/${req.file.filename}`,
      invoice_stn.trim(),
    );

    return res.status(result.status).json(result);
  } catch (error) {
    console.error("STN Upload Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// const extractPdfContent = async (req, res) => {
//     try {
//         const { file_name } = req.params;

//         if (!file_name) {
//             return res.status(400).json({ message: "File name is required" });
//         }

//         // Get document from database
//         const result = await getStnDocumentsByFileName(file_name);

//         if (result.status !== 200 || result.data.length === 0) {
//             return res.status(404).json({ message: "Document not found" });
//         }

//         const document = result.data[0];

//         // Construct correct filesystem path
//         const fileName = path.basename(document.file_path);
//         const filePath = path.join(__dirname, "..", "..", "uploads", "stn", fileName);

//         console.log("Resolved file path:", filePath);
//         console.log("File exists:", fs.existsSync(filePath));

//         // Check if file exists
//         if (!fs.existsSync(filePath)) {
//             return res.status(404).json({ message: "File not found on server: " + filePath });
//         }

//         // Extract text from PDF using pdf-to-text
//         // pdf-to-text exports an object with getText method
//         const text = await new Promise((resolve, reject) => {
//             pdf.getText(filePath, { max: 0 }, (err, text) => {
//                 if (err) reject(err);
//                 else resolve(text);
//             });
//         });

//         console.log("Extracted text length:", text.length);
//         if (text.length > 0) {
//             console.log("First 200 chars:", text.substring(0, 200));
//         } else {
//             console.log("Extracted text is empty!");
//         }

//         // Build response - raw_pdf_json contains only text content fields
//         const responseData = {
//             document_id: document.document_id,
//             file_name: document.file_name,
//             total_pages: 0,
//             text: text.trim(),
//             raw_pdf_json: {
//                 text: text.trim()
//             },
//             info: {},
//             metadata: {},
//             version: null,
//             plainText: text.trim()
//         };

//         return res.status(200).json({
//             status: 200,
//             message: "PDF content extracted successfully",
//             data: responseData
//         });

//     } catch (error) {
//         console.error("PDF Extraction Error:", error);
//         res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };

const extractPdfContent = async (req, res) => {
  try {
    const { invoice_stn } = req.query;

    if (!invoice_stn) {
      return res.status(400).json({ message: "Invoice STN is required" });
    }

    const result = await getStnDocumentsByInvoice(invoice_stn);

    if (result.status !== 200 || result.data.length === 0) {
      return res.status(404).json({ message: "Document not found" });
    }

    const document = result.data[0];

    const fileName = path.basename(document.file_path);
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "uploads",
      "stn",
      fileName,
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    // Python script path
    const pythonScript = path.join(
      __dirname,
      "..",
      "utils",
      "extractor_node.py",
    );

    // Spawn Python process
    const pythonProcess = spawn("python", [pythonScript, filePath]);

    let dataString = "";
    let errorString = "";

    pythonProcess.stdout.on("data", (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorString += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error("Python Error:", errorString);
        return res.status(500).json({
          message: "PDF extraction failed",
          error: errorString,
        });
      }

      try {
        const extractedData = JSON.parse(dataString);
        return res.status(extractedData.status).json(extractedData);
      } catch (err) {
        console.error("JSON Parse Error:", err);
        return res.status(500).json({
          message: "Failed to parse extraction output",
          raw: dataString,
        });
      }
    });
  } catch (error) {
    console.error("Controller Error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const extractExcelData = async (req, res) => {
  try {
    const { invoice_stn } = req.query;

    if (
      !invoice_stn ||
      typeof invoice_stn !== "string" ||
      !invoice_stn.trim()
    ) {
      return res
        .status(400)
        .json({ status: 400, message: "Invoice STN parameter is required" });
    }

    const cleanInvoiceStn = invoice_stn.trim();
    const result = await getStnDocumentsByInvoice(cleanInvoiceStn);
    const locationMap = await getAllocatedLocations(cleanInvoiceStn);
    // Live per-invoice submitted-bag counts, so the STN feed carries real
    // progress the handheld can seed its badges from — instead of a device-local
    // tally that resets when the app cache is cleared or the operator switches
    // handhelds.
    const allocationRows = await getConsolidatedStnRows(cleanInvoiceStn);
    // True (uncapped) bags inwarded per invoice, so the feed can flag an
    // over-scanned invoice (e.g. 18 physical bags against a 17-bag plan) instead
    // of only the plan-capped bags_submitted.
    const inwardedRows = await getInwardedCountsByStn(cleanInvoiceStn);

    if (
      !result ||
      result.status !== 200 ||
      !result.data ||
      result.data.length === 0
    ) {
      return res
        .status(404)
        .json({
          status: 404,
          message: "Document record not found in database",
        });
    }

    const document = result.data[0];
    if (!document.file_path) {
      return res
        .status(422)
        .json({
          status: 422,
          message: "Document record lacks a valid file path",
        });
    }

      if (!locationMap.data || locationMap.data.length === 0) {
      return res
        .status(404)
        .json({
          status: 404,
          message: "STN does not have allocated locations in the system. Please allocate locations first.",
        });
    }

    if (!document.file_path) {
      return res
        .status(422)
        .json({
          status: 422,
          message: "Document record lacks a valid file path",
        });
    }

    const fileName = path.basename(document.file_path);
    const filePath = path.resolve(
      __dirname,
      "..",
      "..",
      "uploads",
      "stn",
      fileName,
    );

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({
          status: 404,
          message: "Target document file missing on storage server",
        });
    }

    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      cellNF: false,
      cellText: false,
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res
        .status(422)
        .json({
          status: 422,
          message: "The uploaded workbook contains no active sheets",
        });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (!matrix || matrix.length === 0) {
      return res
        .status(200)
        .json({ status: 200, message: "Excel sheet is empty", data: [] });
    }

    const NOT_ALLOCATED = "Not Allocated";

    const normalizeInvoice = (val) =>
      String(val || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, ""); // strips /, -, spaces, etc.

    const normalizeGarden = (val) =>
      String(val || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");

    const locationByInvoice = new Map(); // normalized invoice -> location
    const locationByGardenInvoice = new Map(); // "GARDEN__INVOICE" -> location

    // A split invoice has no single bin; render its per-bin breakdown as
    // "bin:bags, bin:bags" so the STN export still shows where the bags went.
    const formatLocationValue = (entry) => {
      if (entry.allocated_location === "SPLIT") {
        if (Array.isArray(entry.splits) && entry.splits.length > 0) {
          return entry.splits
            .map((s) => `${s.location_code}:${s.bags}`)
            .join(", ");
        }
        return NOT_ALLOCATED;
      }
      return entry.allocated_location || "";
    };

    if (Array.isArray(locationMap?.data)) {
      for (const entry of locationMap.data) {
        if (!entry) continue;
        const garden = normalizeGarden(entry.garden_name);
        const invoice = normalizeInvoice(entry.garden_invoice);
        const location = formatLocationValue(entry); // SPLIT -> "bin:bags,..."; null -> ""

        if (invoice) {
          locationByInvoice.set(invoice, location);
          if (garden) locationByGardenInvoice.set(`${garden}__${invoice}`, location);
        }
      }
    }

    const resolveLocation = (garden, invNo) => {
      const normGarden = normalizeGarden(garden);
      const normInvoice = normalizeInvoice(invNo);

      // 1. Best: exact garden + invoice match
      const gardenInvoiceKey = `${normGarden}__${normInvoice}`;
      if (locationByGardenInvoice.has(gardenInvoiceKey)) {
        return locationByGardenInvoice.get(gardenInvoiceKey) || NOT_ALLOCATED;
      }

      // 2. Next best: invoice number alone (most unique field)
      if (normInvoice && locationByInvoice.has(normInvoice)) {
        return locationByInvoice.get(normInvoice) || NOT_ALLOCATED;
      }

      // No allocation of its own → "Not Allocated". We deliberately do NOT fall
      // back to a garden-name-only match: an unallocated invoice would otherwise
      // inherit a same-garden sibling's bin — a reservation that never happened —
      // and the handheld would route bags into a bin the server never reserved.
      return NOT_ALLOCATED;
    };

    let globalInvoiceNo = "";
    let headerRowIndex = -1;

    for (let i = 0; i < matrix.length; i++) {
      const currentRow = matrix[i] || [];
      const rowString = currentRow.map((cell) =>
        String(cell || "")
          .trim()
          .toUpperCase(),
      );

      if (i < 15 && !globalInvoiceNo) {
        for (let j = 0; j < currentRow.length; j++) {
          const cellText = String(currentRow[j] || "");
          const match = cellText.match(/Invoice Number\s*([a-z0-9-_]+)/i);
          if (match && match[1]) {
            globalInvoiceNo = match[1].trim();
          }
        }
      }

      if (
        rowString.includes("GARDEN") &&
        (rowString.includes("NET WEIGHT") || rowString.includes("GROSS WEIGHT"))
      ) {
        headerRowIndex = i;
      }

      if (globalInvoiceNo && headerRowIndex !== -1) break;
    }

    const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 13;

    const findColumnIndex = (rowArr, targetTokens) => {
      if (!rowArr) return -1;
      return rowArr.findIndex((cell) => {
        const cClean = String(cell || "")
          .trim()
          .toUpperCase();
        return targetTokens.some((token) =>
          cClean.includes(token.toUpperCase()),
        );
      });
    };

    const headerRow = headerRowIndex !== -1 ? matrix[headerRowIndex] : [];

    // Dynamic Column Index Matrix Mapping
    let idxGarden = findColumnIndex(headerRow, ["Garden"]);
    let idxGrade = findColumnIndex(headerRow, ["Grade"]); // Dynamic mapping for Grade
    let idxInvNo = findColumnIndex(headerRow, [
      "Garden Inv",
      "Inv No",
      "Invoice No",
    ]);
    let idxBags = findColumnIndex(headerRow, ["No. Of Bags", "Bags"]);
    let idxWtPerBag = findColumnIndex(headerRow, [
      "Nt Wt. Per Bags",
      "Wt/Bag",
      "Wt Per Bag",
    ]);
    let idxNetWt = findColumnIndex(headerRow, ["Net Weight", "Net Wt"]);
    let idxTareWt = findColumnIndex(headerRow, ["Tare Weight", "Tare Wt"]);
    let idxGrossWt = findColumnIndex(headerRow, ["Gross Weight", "Gross Wt"]);

    // Hardcoded structural defaults fallback if dynamic matching finds absolutely nothing
    if (idxGarden === -1) idxGarden = 0;
    if (idxGrade === -1) idxGrade = 1; // Typically follows right after Garden
    if (idxInvNo === -1) idxInvNo = 2;
    if (idxBags === -1) idxBags = 3;
    if (idxWtPerBag === -1) idxWtPerBag = 4;
    if (idxNetWt === -1) idxNetWt = 5;
    if (idxTareWt === -1) idxTareWt = 6;
    if (idxGrossWt === -1) idxGrossWt = 7;

    const formatDecimal = function (val, decimals) {
      if (val === undefined || val === null || String(val).trim() === "")
        return "";
      let numStr = String(val)
        .replace(/,/g, "")
        .replace(/[^\d.]/g, "");
      const num = parseFloat(numStr);
      return isNaN(num) ? "" : num.toFixed(decimals);
    };

    const standardizedRows = [];

    // 4. Data Extraction Loop
    for (let r = startRow; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length === 0) continue;

      const gardenCell = String(row[idxGarden] || "").trim();
      const firstCell = String(row[0] || "").trim();
      const secondCell = String(row[1] || "").trim();

      // Skip structural lines, empty templates, and total blocks safely
      if (
        !gardenCell ||
        gardenCell === "" ||
        firstCell.toUpperCase().includes("TOTAL") ||
        secondCell.toUpperCase().includes("TOTAL") ||
        gardenCell.toUpperCase().includes("TOTAL")
      ) {
        continue;
      }

      let gardenName = gardenCell;
      // Guarantee standard formatting for specific nomenclature suffix requirements
      if (
        !gardenName.toUpperCase().endsWith("GOLD") &&
        !gardenName.toUpperCase().endsWith("FINE")
      ) {
        gardenName = `${gardenName} GOLD`;
      }

      let gardenInvNo =
        idxInvNo !== -1 ? String(row[idxInvNo] || "").trim() : "";
      if (!gardenInvNo) {
        gardenInvNo = globalInvoiceNo || cleanInvoiceStn;
      }

      // Safe retrieval for Grade text string
      let gradeStr = idxGrade !== -1 ? String(row[idxGrade] || "").trim() : "";

      // Read values based on our dynamic position pointers
      let bags = formatDecimal(row[idxBags], 0);
      let wtPerBag = formatDecimal(row[idxWtPerBag], 2);
      let netWt = formatDecimal(row[idxNetWt], 2);
      let tareWt = formatDecimal(row[idxTareWt], 2);
      let grossWt = formatDecimal(row[idxGrossWt], 2);

      // Handle structural index adjustments if rows shifted
      if (!netWt || parseFloat(netWt) > 10000 || isNaN(parseFloat(netWt))) {
        bags = formatDecimal(row[idxBags + 2], 0);
        wtPerBag = formatDecimal(row[idxWtPerBag + 2], 2);
        netWt = formatDecimal(row[idxNetWt + 2], 2);
        tareWt = formatDecimal(row[idxTareWt + 2], 2);
        grossWt = formatDecimal(row[idxGrossWt + 2], 2);

        // Also slide the Grade cell forward if fallback shifts occur
        if (idxGrade !== -1 && row[idxGrade + 2]) {
          gradeStr = String(row[idxGrade + 2]).trim();
        }
      }

      // Drop blank metric lines to maintain target database sanity
      if (!netWt || isNaN(parseFloat(netWt)) || parseFloat(netWt) === 0) {
        continue;
      }

      // Resolve the allocated location for this Garden + Garden Inv No pair
      const allocatedLocation = resolveLocation(gardenName, gardenInvNo);

      // Structure object exactly into the required API output layout
      standardizedRows.push({
        Garden: gardenName,
        Grade: gradeStr, // Added Grade to the response object template
        "Garden Inv No": gardenInvNo,
        "No. of Bags": bags,
        "Nt Wt. Per Bags": wtPerBag,
        "Net Weight": netWt,
        "Tare Weight": tareWt,
        "Gross Weight": grossWt,
        Location: allocatedLocation, // "Not Allocated" if null / no match found
      });
    }

    // A Garden Invoice is normally split across two Excel rows — the full bags
    // at the standard weight, then the leftover part-bag. Same tea, same bin,
    // so club them into the one row Assign Location actually stores, or the
    // Android inward flow sees 2 rows for a bin holding 1 invoice.
    // Keyed on Garden + Invoice: an invoice no. is only unique within a garden.
    const mergedRows = [];
    const rowByKey = new Map();

    const sumDecimal = (a, b) =>
      (parseFloat(a || 0) + parseFloat(b || 0)).toFixed(2);

    for (const row of standardizedRows) {
      const key = `${normalizeGarden(row.Garden)}__${normalizeInvoice(row["Garden Inv No"])}`;
      const existing = rowByKey.get(key);

      if (!existing) {
        rowByKey.set(key, row);
        mergedRows.push(row);
        continue;
      }

      existing["No. of Bags"] = String(
        parseInt(existing["No. of Bags"] || 0, 10) +
          parseInt(row["No. of Bags"] || 0, 10),
      );
      existing["Net Weight"] = sumDecimal(existing["Net Weight"], row["Net Weight"]);
      existing["Tare Weight"] = sumDecimal(existing["Tare Weight"], row["Tare Weight"]);
      existing["Gross Weight"] = sumDecimal(existing["Gross Weight"], row["Gross Weight"]);

      // Standard bag weight wins — the full bags carry it, the odd bag is the
      // remainder. Averaging would invent a weight no physical bag has.
      existing["Nt Wt. Per Bags"] = Math.max(
        parseFloat(existing["Nt Wt. Per Bags"] || 0),
        parseFloat(row["Nt Wt. Per Bags"] || 0),
      ).toFixed(2);
    }

    // Stamp each invoice's already-submitted count onto the feed row. Keyed by
    // the same normalized invoice used for location matching, so a "C-318" plan
    // row still lines up with a "C318" allocation.
    const submittedByInvoice = new Map();
    if (allocationRows && Array.isArray(allocationRows.data)) {
      for (const a of allocationRows.data) {
        const inv = normalizeInvoice(a.garden_invoice);
        if (inv) submittedByInvoice.set(inv, a.bags_submitted || 0);
      }
    }
    // Actual inwarded (uncapped) count per invoice, same normalized key.
    const inwardedByInvoice = new Map();
    if (inwardedRows && Array.isArray(inwardedRows.data)) {
      for (const r of inwardedRows.data) {
        const inv = normalizeInvoice(r.garden_invoice);
        if (inv) inwardedByInvoice.set(inv, r.inwarded || 0);
      }
    }
    for (const row of mergedRows) {
      const inv = normalizeInvoice(row["Garden Inv No"]);
      row["Bags Submitted"] = submittedByInvoice.get(inv) || 0;
      // Uncapped physical count. The handheld seeds its badge from this (falling
      // back to Bags Submitted on an older server) so an over-scanned invoice
      // reads 18/17 and stays that way after a reload.
      row["Bags Inwarded"] = inwardedByInvoice.get(inv) || 0;
    }

    return res.status(200).json({
      status: 200,
      message: "Excel data extracted successfully",
      data: mergedRows,
    });
  } catch (error) {
    console.error("Critical extraction failure context loop:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error occurred during extraction",
      error: error.message,
    });
  }
};

const getStnDocument = async (req, res) => {
  try {
    const { file_name } = req.params;

    if (!file_name) {
      return res.status(400).json({ message: "File Name is required" });
    }

    const result = await getStnDocumentsByFileName(file_name);

    const baseURL = `${req.protocol}://${req.get("host")}`;
    const updatedData = result.data.map((doc) => ({
      ...doc,
      file_path: `${baseURL}${doc.file_path}`,
    }));

    return res.status(result.status).json({
      status: result.status,
      message: result.message,
      data: updatedData,
    });
  } catch (error) {
    console.error("Get STN Documents Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getStnDocumentByInvoice = async (req, res) => {
  try {
    const { invoice_stn } = req.params;

    if (!invoice_stn) {
      return res.status(400).json({ message: "Invoice STN is required" });
    }

    const result = await getStnDocumentsByInvoice(invoice_stn);

    const baseURL = `${req.protocol}://${req.get("host")}`;
    const updatedData = result.data.map((doc) => ({
      ...doc,
      file_path: `${baseURL}${doc.file_path}`,
    }));

    return res.status(result.status).json({
      status: result.status,
      message: result.message,
      data: updatedData,
    });
  } catch (error) {
    console.error("Get STN Documents Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteStn = async (req, res) => {
  try {
    const { documentId } = req.query;

    if (!documentId) {
      return res.status(400).json({ message: "Document ID is required" });
    }

    const result = await deleteStnDocument(documentId);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Delete STN Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllStnDocuments = async (req, res) => {
  try {
    const result = await getStnDocuments();
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Get All STN Documents Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const stnStatusUpdate = async (req, res) => {
  try {
    const stn = req.body;
    if (!stn || !stn.invoice_stn || !stn.status || !stn.summary) {
      return res
        .status(400)
        .json({ message: "Invoice STN, new status, and summary are required" });
    }
    const result = await stnStatusUpdateAudit(
      stn.invoice_stn,
      stn.status,
      stn.summary,
    );
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("STN Status Update Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Consolidates the raw STN Excel by Garden Invoice (summing bag counts) and
// persists the working rows with the two new columns (Allocated Location,
// Bags Submitted) so Assign/Release have something to operate on.
const consolidateStn = async (req, res) => {
  try {
    const { invoice_stn } = req.body;

    if (!invoice_stn || typeof invoice_stn !== "string" || !invoice_stn.trim()) {
      return res.status(400).json({ status: 400, message: "Invoice STN is required" });
    }

    const cleanInvoiceStn = invoice_stn.trim();
    const docResult = await getStnDocumentsByInvoice(cleanInvoiceStn);

    if (!docResult || docResult.status !== 200 || !docResult.data || docResult.data.length === 0) {
      return res.status(404).json({ status: 404, message: "Document record not found in database" });
    }
    const document = docResult.data[0];
    if (!document.file_path) {
      return res.status(422).json({ status: 422, message: "Document record lacks a valid file path" });
    }

    const filePath = resolveStnFilePath(document);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: 404, message: "Target document file missing on storage server" });
    }

    const rawRows = parseStnWorkbookRows(filePath, cleanInvoiceStn);
    const { consolidated, invalid } = consolidateStnRows(rawRows);

    const result = await upsertConsolidatedStnRows(cleanInvoiceStn, consolidated);

    if (invalid.length > 0 && result.status === 200) {
      result.message += ` (${invalid.length} row(s) skipped for zero/negative bag count)`;
      result.invalid = invalid;
    }
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("STN Consolidate Error:", error);
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

const getStnAllocations = async (req, res) => {
  try {
    const { invoice_stn } = req.query;

    if (!invoice_stn) {
      return res.status(400).json({ status: 400, message: "Invoice STN is required" });
    }

    const result = await getConsolidatedStnRows(invoice_stn.trim());
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Get STN Allocations Error:", error);
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

// Assign Location — runs the first-fit allocation algorithm across all
// consolidated rows for this STN, reserving bin capacity as it goes.
const allocateStn = async (req, res) => {
  try {
    const { invoice_stn } = req.body;

    if (!invoice_stn || typeof invoice_stn !== "string" || !invoice_stn.trim()) {
      return res.status(400).json({ status: 400, message: "Invoice STN is required" });
    }

    const result = await allocateStnBins(invoice_stn.trim());
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("STN Allocate Error:", error);
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

// Release Location — returns the unsubmitted portion of every allocated
// invoice back to its bin. Called when a truck fails to arrive.
const releaseStn = async (req, res) => {
  try {
    const { invoice_stn } = req.body;

    if (!invoice_stn || typeof invoice_stn !== "string" || !invoice_stn.trim()) {
      return res.status(400).json({ status: 400, message: "Invoice STN is required" });
    }

    const result = await releaseStnBins(invoice_stn.trim());
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("STN Release Error:", error);
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

// Called by the Android inward flow as bags are physically submitted.
const incrementSubmitted = async (req, res) => {
  try {
    const { invoice_stn, garden_invoice, bags, location } = req.body;
    const bagsNum = parseInt(bags, 10);

    if (!invoice_stn || !garden_invoice || !bagsNum || bagsNum <= 0) {
      return res.status(400).json({
        status: 400,
        message: "invoice_stn, garden_invoice, and a positive integer bags are required",
      });
    }

    const result = await incrementBagsSubmitted(
      invoice_stn.trim(),
      garden_invoice.trim(),
      bagsNum,
      location ? String(location).trim() : undefined,
    );
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("STN Increment Submitted Error:", error);
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

// Manual location assignment — for the invoice rows that Assign Location
// couldn't place automatically (or an operator override for any unallocated row).
const manualAssignStn = async (req, res) => {
  try {
    const { invoice_stn, garden_invoice, location, force } = req.body;

    if (!invoice_stn || !garden_invoice || !location) {
      return res.status(400).json({
        status: 400,
        message: "invoice_stn, garden_invoice, and location are required",
      });
    }

    const result = await manualAssignStnBin(
      invoice_stn.trim(),
      garden_invoice.trim(),
      String(location).trim(),
      !!force,
    );
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("STN Manual Assign Error:", error);
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

// Called by the Putaway handheld when an operator redirects an invoice that is
// already allocated to a bin. Unlike manualAssign (which only places an
// unallocated row), this moves a live allocation: its reservation, its
// in-transit bags, and the mapping inward reads to route the bags still coming.
const relocateInvoice = async (req, res) => {
  try {
    const { invoice_stn, garden_invoice, new_location, operator_id, force } = req.body;

    if (!invoice_stn || !garden_invoice || !new_location) {
      return res.status(400).json({
        status: 400,
        message: "invoice_stn, garden_invoice, and new_location are required",
      });
    }

    const result = await relocateStnInvoice(
      String(invoice_stn).trim(),
      String(garden_invoice).trim(),
      String(new_location).trim(),
      operator_id ? String(operator_id).trim() : undefined,
      !!force,
    );
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("STN Relocate Invoice Error:", error);
    res.status(500).json({ status: 500, message: "Internal server error" });
  }
};

module.exports = {
  uploadStn,
  extractPdfContent,
  getStnDocument,
  getStnDocumentByInvoice,
  deleteStn,
  getAllStnDocuments,
  extractExcelData,
  stnStatusUpdate,
  consolidateStn,
  getStnAllocations,
  allocateStn,
  releaseStn,
  incrementSubmitted,
  manualAssignStn,
  relocateInvoice,
};
