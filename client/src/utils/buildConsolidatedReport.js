import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/**
 * Builds a polished, client-ready "Material Movement Report" workbook.
 *
 * Layout: a SINGLE styled sheet —
 *   Brand banner  ->  Summary KPIs  ->  Material Inward table  ->  Material Outward table.
 * Replaces the old single-sheet xlsx dump that could not be styled.
 */

// ---- Brand / theme ---------------------------------------------------------
const BRAND = "Hindustan Unilever Limited  |  HRC";
const REPORT_TITLE = "Material Movement Report";

const COLORS = {
  brand: "FF13327A", // HUL deep blue
  inward: "FF1B7F4B", // green
  outward: "FFB45309", // amber
  headerText: "FFFFFFFF",
  zebra: "FFF4F6F8",
  totalFill: "FFE8EDF3",
  border: "FFD0D7DE",
};

const WEIGHT_FMT = "#,##0.00";
const DATE_FMT = "dd-mmm-yyyy";

// ---- Small helpers ---------------------------------------------------------
const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const thinBorder = {
  top: { style: "thin", color: { argb: COLORS.border } },
  left: { style: "thin", color: { argb: COLORS.border } },
  bottom: { style: "thin", color: { argb: COLORS.border } },
  right: { style: "thin", color: { argb: COLORS.border } },
};

const fmtStamp = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours(),
  )}${p(d.getMinutes())}`;
};

// Map a raw movement item to a flat row object.
const mapRow = (item) => ({
  garden: item.attributes?.Garden ?? "",
  grade: item.attributes?.Grade ?? "",
  invNo: item.attributes?.["Garden Inv No"] ?? "",
  bags: num(item.attributes?.["No. of Bags"]),
  net: num(item.attributes?.["Net Weight"]),
  tare: num(item.attributes?.["Tare Weight"]),
  gross: num(item.attributes?.["Gross Weight"]),
  location: item.location ?? "",
  purpose: item.purpose ?? "",
  date: toDate(item.moved_at),
});

const totals = (rows) =>
  rows.reduce(
    (acc, r) => ({
      bags: acc.bags + r.bags,
      net: acc.net + r.net,
      tare: acc.tare + r.tare,
      gross: acc.gross + r.gross,
    }),
    { bags: 0, net: 0, tare: 0, gross: 0 },
  );

// Column definitions for the movement tables.
const MOVE_COLUMNS = [
  { header: "S.No", key: "sno", width: 7, align: "center" },
  { header: "Garden", key: "garden", width: 22 },
  { header: "Garden Inv No", key: "invNo", width: 16 },
  { header: "Grade", key: "grade", width: 14 },
  { header: "No. of Bags", key: "bags", width: 13, align: "right" },
  { header: "Net Weight (kg)", key: "net", width: 15, align: "right", fmt: WEIGHT_FMT },
  { header: "Tare Weight (kg)", key: "tare", width: 15, align: "right", fmt: WEIGHT_FMT },
  { header: "Gross Weight (kg)", key: "gross", width: 16, align: "right", fmt: WEIGHT_FMT },
  { header: "Location", key: "location", width: 20 },
  { header: "Purpose", key: "purpose", width: 18 },
  { header: "Date", key: "date", width: 14, align: "center", fmt: DATE_FMT },
];

const LAST_COL = MOVE_COLUMNS.length; // 10  -> column J

// ---- Building blocks -------------------------------------------------------
// A full-width coloured banner across the sheet.
function bannerRow(ws, rowIdx, text, fill, { size = 13, italic = false, color = COLORS.headerText, height = 24 } = {}) {
  ws.mergeCells(rowIdx, 1, rowIdx, LAST_COL);
  const cell = ws.getCell(rowIdx, 1);
  cell.value = text;
  cell.font = { bold: !italic, italic, size, color: { argb: color } };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  ws.getRow(rowIdx).height = height;
}

// Writes one Inward/Outward table starting at `startRow`. Returns next free row.
function writeSection(ws, startRow, accent, label, rows) {
  let r = startRow;

  // Section banner
  bannerRow(ws, r, label, accent);
  r += 1;

  // Header
  const headerRowIdx = r;
  const headerRow = ws.getRow(headerRowIdx);
  MOVE_COLUMNS.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accent } };
    cell.alignment = { vertical: "middle", horizontal: c.align || "left", wrapText: true };
    cell.border = thinBorder;
  });
  headerRow.height = 22;
  r += 1;

  // Data rows
  if (rows.length === 0) {
    ws.mergeCells(r, 1, r, LAST_COL);
    const empty = ws.getCell(r, 1);
    empty.value = "No records in the selected range.";
    empty.font = { italic: true, color: { argb: "FF888888" } };
    empty.alignment = { vertical: "middle", horizontal: "center" };
    empty.border = thinBorder;
    r += 1;
  } else {
    rows.forEach((row, idx) => {
      const xlRow = ws.getRow(r);
      const values = {
        sno: idx + 1,
        garden: row.garden,
        grade: row.grade,
        invNo: row.invNo,
        bags: row.bags,
        net: row.net,
        tare: row.tare,
        gross: row.gross,
        location: row.location,
        purpose: row.purpose,
        date: row.date,
      };
      MOVE_COLUMNS.forEach((c, i) => {
        const cell = xlRow.getCell(i + 1);
        cell.value = values[c.key];
        if (c.fmt) cell.numFmt = c.fmt;
        cell.alignment = { vertical: "middle", horizontal: c.align || "left" };
        cell.border = thinBorder;
        if (idx % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.zebra } };
        }
      });
      r += 1;
    });
  }

  // Totals row
  const t = totals(rows);
  const totalRow = ws.getRow(r);
  // Merge the label across every column before the first numeric (bags) column.
  const bagsCol = MOVE_COLUMNS.findIndex((c) => c.key === "bags") + 1;
  ws.mergeCells(r, 1, r, bagsCol - 1);
  const labelCell = totalRow.getCell(1);
  labelCell.value = "TOTAL";
  labelCell.font = { bold: true };
  labelCell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
  const totalValues = { bags: t.bags, net: t.net, tare: t.tare, gross: t.gross };
  MOVE_COLUMNS.forEach((c, i) => {
    const cell = totalRow.getCell(i + 1);
    if (c.key in totalValues) {
      cell.value = totalValues[c.key];
      if (c.fmt) cell.numFmt = c.fmt;
    }
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.totalFill } };
    cell.alignment = { vertical: "middle", horizontal: c.align || "left" };
    cell.border = thinBorder;
  });
  r += 1;

  return { nextRow: r, totals: t };
}

// Writes the Summary KPI block (label / inward / outward). Returns next free row.
function writeSummary(ws, startRow, inwardRows, outwardRows, inT, outT) {
  let r = startRow;
  bannerRow(ws, r, "SUMMARY", COLORS.brand);
  r += 1;

  // 3-column KPI table using merged ranges: label (A:F) | Inward (G:H) | Outward (I:J)
  const writeKpi = (label, inw, out, { fmt, isHeader = false, highlight = false } = {}) => {
    const row = ws.getRow(r);
    ws.mergeCells(r, 1, r, 6);
    ws.mergeCells(r, 7, r, 8);
    ws.mergeCells(r, 9, r, LAST_COL);
    const fill = isHeader ? COLORS.brand : highlight ? COLORS.totalFill : null;
    const cellsMeta = [
      { col: 1, val: label, align: "left", indent: 1 },
      { col: 7, val: inw, align: "right" },
      { col: 9, val: out, align: "right" },
    ];
    cellsMeta.forEach((m) => {
      const cell = row.getCell(m.col);
      cell.value = m.val;
      if (fmt && !isHeader) cell.numFmt = fmt;
      cell.font = isHeader
        ? { bold: true, color: { argb: COLORS.headerText } }
        : { bold: m.col === 1 || highlight };
      if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      cell.alignment = { vertical: "middle", horizontal: m.align, indent: m.indent || 0 };
      cell.border = thinBorder;
    });
    row.height = 18;
    r += 1;
  };

  writeKpi("Metric", "Inward", "Outward", { isHeader: true });
  writeKpi("No. of consignments", inwardRows.length, outwardRows.length);
  writeKpi("Total bags", inT.bags, outT.bags);
  writeKpi("Total net weight (kg)", inT.net, outT.net, { fmt: WEIGHT_FMT });
  writeKpi("Total tare weight (kg)", inT.tare, outT.tare, { fmt: WEIGHT_FMT });
  writeKpi("Total gross weight (kg)", inT.gross, outT.gross, { fmt: WEIGHT_FMT, highlight: true });

  // Net-flow line (single value)
  const row = ws.getRow(r);
  ws.mergeCells(r, 1, r, 6);
  ws.mergeCells(r, 7, r, LAST_COL);
  const lab = row.getCell(1);
  lab.value = "Net flow (Inward - Outward bags)";
  lab.font = { bold: true };
  lab.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.totalFill } };
  lab.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  lab.border = thinBorder;
  const val = row.getCell(7);
  val.value = inT.bags - outT.bags;
  val.font = { bold: true };
  val.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.totalFill } };
  val.alignment = { vertical: "middle", horizontal: "right" };
  val.border = thinBorder;
  r += 1;

  return r;
}

// ---- Public API ------------------------------------------------------------
export function buildReportWorkbook({ inward, outward, fromDate, toDate, now = new Date() }) {
  const meta = `Report range: ${fromDate} to ${toDate}    •    Generated: ${now.toLocaleString()}`;

  const inwardRows = (inward || []).map(mapRow);
  const outwardRows = (outward || []).map(mapRow);
  const inT = totals(inwardRows);
  const outT = totals(outwardRows);

  const wb = new ExcelJS.Workbook();
  wb.creator = "HUL HRC";
  wb.created = now;

  const ws = wb.addWorksheet("Material Movement Report", {
    views: [{ state: "frozen", ySplit: 3 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:3",
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  // Apply column widths.
  MOVE_COLUMNS.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
  });

  // Top banners (rows 1-3).
  bannerRow(ws, 1, BRAND, COLORS.brand, { size: 16, height: 30 });
  bannerRow(ws, 2, REPORT_TITLE, COLORS.brand, { size: 13, height: 22 });
  bannerRow(ws, 3, meta, null, { size: 10, italic: true, color: "FF555555", height: 18 });

  // Summary, then the two sections (one blank spacer row between blocks).
  let r = 5;
  r = writeSummary(ws, r, inwardRows, outwardRows, inT, outT);
  r += 1;
  r = writeSection(ws, r, COLORS.inward, "MATERIAL INWARD", inwardRows).nextRow;
  r += 1;
  writeSection(ws, r, COLORS.outward, "MATERIAL OUTWARD", outwardRows);

  return wb;
}

export function reportFileName(fromDate, toDate, now = new Date()) {
  // Short, but the timestamp keeps every download unique (no overwrite).
  // The full date range is shown inside the report banner.
  return `HUL-HRC_Report_${fmtStamp(now)}.xlsx`;
}

export async function downloadConsolidatedReport({ inward, outward, fromDate, toDate }) {
  const now = new Date();
  const wb = buildReportWorkbook({ inward, outward, fromDate, toDate, now });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, reportFileName(fromDate, toDate, now));
}
