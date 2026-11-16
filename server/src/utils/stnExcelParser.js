const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

// Resolves a documents-table record for an STN to its file on disk.
// Mirrors the lookup used in stnController.extractExcelData.
const resolveStnFilePath = (document) => {
  const fileName = path.basename(document.file_path);
  return path.resolve(__dirname, "..", "..", "uploads", "stn", fileName);
};

// Parses the raw STN workbook into one JS object per Excel row (no
// deduplication yet). Uses the same fuzzy header detection as the existing
// extractExcelData endpoint so both code paths agree on column mapping.
const parseStnWorkbookRows = (filePath, fallbackInvoiceStn) => {
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return [];
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!matrix || matrix.length === 0) return [];

  let globalInvoiceNo = "";
  let headerRowIndex = -1;

  for (let i = 0; i < matrix.length; i++) {
    const currentRow = matrix[i] || [];
    const rowString = currentRow.map((cell) =>
      String(cell || "").trim().toUpperCase(),
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
      const cClean = String(cell || "").trim().toUpperCase();
      return targetTokens.some((token) => cClean.includes(token.toUpperCase()));
    });
  };

  const headerRow = headerRowIndex !== -1 ? matrix[headerRowIndex] : [];

  let idxGarden = findColumnIndex(headerRow, ["Garden"]);
  let idxGrade = findColumnIndex(headerRow, ["Grade"]);
  let idxInvNo = findColumnIndex(headerRow, ["Garden Inv", "Inv No", "Invoice No"]);
  let idxBags = findColumnIndex(headerRow, ["No. Of Bags", "Bags"]);
  let idxWtPerBag = findColumnIndex(headerRow, ["Nt Wt. Per Bags", "Wt/Bag", "Wt Per Bag"]);
  let idxNetWt = findColumnIndex(headerRow, ["Net Weight", "Net Wt"]);
  let idxTareWt = findColumnIndex(headerRow, ["Tare Weight", "Tare Wt"]);
  let idxGrossWt = findColumnIndex(headerRow, ["Gross Weight", "Gross Wt"]);

  if (idxGarden === -1) idxGarden = 0;
  if (idxGrade === -1) idxGrade = 1;
  if (idxInvNo === -1) idxInvNo = 2;
  if (idxBags === -1) idxBags = 3;
  if (idxWtPerBag === -1) idxWtPerBag = 4;
  if (idxNetWt === -1) idxNetWt = 5;
  if (idxTareWt === -1) idxTareWt = 6;
  if (idxGrossWt === -1) idxGrossWt = 7;

  const formatDecimal = (val, decimals) => {
    if (val === undefined || val === null || String(val).trim() === "") return "";
    let numStr = String(val).replace(/,/g, "").replace(/[^\d.]/g, "");
    const num = parseFloat(numStr);
    return isNaN(num) ? "" : num.toFixed(decimals);
  };

  const rows = [];

  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0) continue;

    const gardenCell = String(row[idxGarden] || "").trim();
    const firstCell = String(row[0] || "").trim();
    const secondCell = String(row[1] || "").trim();

    if (
      !gardenCell ||
      firstCell.toUpperCase().includes("TOTAL") ||
      secondCell.toUpperCase().includes("TOTAL") ||
      gardenCell.toUpperCase().includes("TOTAL")
    ) {
      continue;
    }

    let gardenName = gardenCell;
    if (!gardenName.toUpperCase().endsWith("GOLD") && !gardenName.toUpperCase().endsWith("FINE")) {
      gardenName = `${gardenName} GOLD`;
    }

    let gardenInvNo = idxInvNo !== -1 ? String(row[idxInvNo] || "").trim() : "";
    if (!gardenInvNo) {
      gardenInvNo = globalInvoiceNo || fallbackInvoiceStn;
    }

    let gradeStr = idxGrade !== -1 ? String(row[idxGrade] || "").trim() : "";

    let bags = formatDecimal(row[idxBags], 0);
    let netWt = formatDecimal(row[idxNetWt], 2);

    if (!netWt || parseFloat(netWt) > 10000 || isNaN(parseFloat(netWt))) {
      bags = formatDecimal(row[idxBags + 2], 0);
      netWt = formatDecimal(row[idxNetWt + 2], 2);
      if (idxGrade !== -1 && row[idxGrade + 2]) {
        gradeStr = String(row[idxGrade + 2]).trim();
      }
    }

    if (!netWt || isNaN(parseFloat(netWt)) || parseFloat(netWt) === 0) continue;

    const bagsNum = parseInt(bags, 10);

    rows.push({
      garden_name: gardenName,
      grade: gradeStr,
      garden_invoice: gardenInvNo,
      total_bags: isNaN(bagsNum) ? 0 : bagsNum,
      net_weight: netWt === "" ? null : parseFloat(netWt),
    });
  }

  return rows;
};

// An invoice number, stripped to a canonical form so the same invoice written
// slightly differently across rows ("C318", "C-318", "C318 ") still clubs into
// one. Matches the normalization stnController.extractExcelData uses for its
// feed, so the DB total and the STN-Info view always agree.
const normalizeInvoice = (val) =>
  String(val || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

// Groups raw rows by Garden Invoice, summing bag counts. An invoice is normally
// split across several Excel rows — the full bags at the standard weight, then
// the odd/part bag(s) — and they must club into the one row Assign allocates
// against, or the bags never get a bin.
//
// The club key is the invoice number ALONE: for a given invoice the garden is
// always the same, and the weights are throwaway (sample bags), so there is
// nothing to reconcile — the first row's garden/grade stands for the clubbed
// row and net weight is summed only to keep a sensible record. We deliberately
// do NOT reject an invoice whose part-bag row carries a blank/different grade;
// treating that as a conflict aborted the whole consolidation and left Assign
// with no row to place.
const consolidateStnRows = (rawRows) => {
  const byInvoice = new Map();
  const order = [];
  const invalid = [];

  rawRows.forEach((row, idx) => {
    if (!row.garden_invoice) return;

    if (!row.total_bags || row.total_bags <= 0) {
      invalid.push({ garden_invoice: row.garden_invoice, reason: "Zero or negative bag count" });
      return;
    }

    const key = normalizeInvoice(row.garden_invoice);
    if (!key) return;

    if (!byInvoice.has(key)) {
      byInvoice.set(key, {
        garden_invoice: row.garden_invoice,
        garden_name: row.garden_name,
        grade: row.grade,
        net_weight: 0,
        total_bags: 0,
        row_order: idx,
      });
      order.push(key);
    }

    const existing = byInvoice.get(key);
    existing.total_bags += row.total_bags;
    existing.net_weight += row.net_weight || 0;
  });

  const consolidated = order.map((key) => {
    const row = byInvoice.get(key);
    row.net_weight = Math.round(row.net_weight * 100) / 100; // kill float drift from summing
    return row;
  });

  return { consolidated, invalid };
};

module.exports = {
  resolveStnFilePath,
  parseStnWorkbookRows,
  consolidateStnRows,
};
