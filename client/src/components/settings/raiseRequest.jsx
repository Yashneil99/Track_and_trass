import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as XLSX from 'xlsx'; // npm install xlsx
import {
    CardContent, Typography,
    Button, Box, Alert, CircularProgress, Stack, Divider, Paper, Snackbar,
    List, ListItem, ListItemText, ListItemAvatar, Avatar,
    Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
    Chip, IconButton, Tooltip, Collapse,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import {
    Send as SendIcon, LocalShipping as ShippingIcon,
    UploadFile as UploadFileIcon, Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon, Cancel as CancelIcon,
    WarningAmber as WarningIcon, Delete as DeleteIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon, KeyboardArrowUp as KeyboardArrowUpIcon
} from '@mui/icons-material';
import { fetchOccupancyDistribution } from '../../features/materialMovement/materialMovementSlice';
import { createNewRaiseRequest } from '../../features/raise/raiseSlice';
import { fetchPendingRaiseRequests, deleteRaiseRequest } from '../../features/raise/raiseService';
import { io } from 'socket.io-client';

const BIN_FIELD = {
    locationCode: (bin) => bin.location_code,
    locationName: (bin) => bin.location_name,
    availableBags: (bin) => parseInt(bin.total_occupied_in_bin, 10) || 0,
};

const MATERIAL_FIELD = {
    garden: (attrs) => attrs?.['Garden'],
    gardenInvNo: (attrs) => attrs?.['Garden Inv No'],
    grade: (attrs) => attrs?.['Grade'],
    bags: (attrs) => parseInt(attrs?.['No. of Bags'], 10) || 0,
};

// A bag is only pickable once putaway is done. 'In Transit' means it's assigned
// to the bin but not physically placed yet, so an outward request for it would
// send the operator to a bin where the bag isn't there. Occupancy still counts
// these (correctly — the bin's capacity is reserved), so we filter here.
const isPlaced = (tag) => norm(tag?.status) !== 'INTRANSIT';


// Sto.Loc values whose stock may be pulled for outward. Single letters match a
// godown (A, B, C, D, L); full/numeric codes like '5001' are matched too.
const ALLOWED_GODOWNS = ['A', 'B', 'C', 'D', 'L', '5001'];

const norm = (v) => (v ?? '').toString().trim().toUpperCase().replace(/\s+/g, '');

// Calculate similarity between two strings using Levenshtein distance (0-1 scale).
// Used for soft matching of garden names that may be truncated or misspelled.
function stringSimilarity(str1, str2) {
    const a = norm(str1);
    const b = norm(str2);
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Levenshtein distance
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = a[j - 1] === b[i - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    const maxLen = Math.max(a.length, b.length);
    return 1 - (matrix[b.length][a.length] / maxLen);
}

// --- Shared row rules (used by every parser, whatever the file format) --------

// Eligible Sto.Loc: not a subtotal/grand-total line, and starts with an allowed
// godown code (single letter like B, or a full/numeric code like 5001).
function isAllowedStoLoc(stoLoc) {
    const u = stoLoc.toUpperCase();
    if (u.startsWith('TOTAL') || u.startsWith('GRAND')) return false;
    return ALLOWED_GODOWNS.some((g) => u.startsWith(String(g).toUpperCase()));
}

// A usable material line must carry the full matching identity (Garden + Inv No
// + Grade) and a positive bag count. Rows missing Inv No/Grade (e.g. "assorted"
// placeholder lines) can't be matched to stock, so they're skipped.
function isCompleteMaterial(garden, gardenInvNo, grade, totalBags) {
    return Boolean(garden) && Boolean(gardenInvNo) && Boolean(grade) && totalBags > 0;
}

// SAP prints the same material table once per blending-head block (e.g. heads
// 1-10 and 11-20), each with the SAME Total Bags, so a file lists every material
// several times. Collapse rows identical on their material identity so the
// requirement isn't multiplied by the number of blocks/sheets.
function dedupeRows(rows) {
    const seen = new Set();
    return rows.filter((row) => {
        const key = [row.stoLoc, row.batchNumber, row.garden, row.gardenInvNo, row.grade, row.totalBags]
            .map(norm)
            .join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// --- Excel (.xlsx / .xls) -----------------------------------------------------
function parseWorkbook(arrayBuffer) {
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const extracted = [];

    wb.SheetNames.forEach((sheetName) => {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

        let headerRowIdx = -1;
        let colIdx = {};
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i] || [];
            const cellMatch = (cell, needle) =>
                typeof cell === 'string' && cell.replace(/\s+/g, ' ').trim().toUpperCase().startsWith(needle);

            const stoLocCol = row.findIndex((c) => cellMatch(c, 'STO'));
            if (stoLocCol !== -1) {
                headerRowIdx = i;
                row.forEach((c, idx) => {
                    if (typeof c !== 'string') return;
                    const label = c.replace(/\s+/g, ' ').trim().toUpperCase();
                    if (label.startsWith('STO')) colIdx.stoLoc = idx;
                    else if (label.startsWith('BATCH')) colIdx.batchNumber = idx;
                    else if (label.startsWith('GARDEN INV') || label === 'GARDEN\nINV.NO') colIdx.gardenInvNo = idx;
                    else if (label.startsWith('GARDEN')) colIdx.garden = idx;
                    else if (label.startsWith('GRADE')) colIdx.grade = idx;
                    else if (label.startsWith('TOTAL BAGS') || (label.startsWith('TOTAL') && label.includes('BAG'))) colIdx.totalBags = idx;
                });
                break;
            }
        }

        if (headerRowIdx === -1 || colIdx.stoLoc === undefined) return;

        for (let i = headerRowIdx + 1; i < rows.length; i++) {
            const row = rows[i] || [];
            const stoLocRaw = row[colIdx.stoLoc];
            if (stoLocRaw === null || stoLocRaw === undefined || stoLocRaw === '') continue;
            const stoLoc = String(stoLocRaw).trim(); // Sto.Loc may be a number (e.g. 5001) in the sheet
            if (!isAllowedStoLoc(stoLoc)) continue;

            const garden = (row[colIdx.garden] ?? '').toString().trim();
            const gardenInvNo = (row[colIdx.gardenInvNo] ?? '').toString().trim();
            const grade = (row[colIdx.grade] ?? '').toString().trim();
            const totalBags = parseInt(row[colIdx.totalBags], 10);
            if (!isCompleteMaterial(garden, gardenInvNo, grade, totalBags)) continue;

            extracted.push({
                id: `${sheetName}-${i}`,
                sheetName,
                stoLoc,
                batchNumber: colIdx.batchNumber !== undefined ? row[colIdx.batchNumber] : null,
                garden,
                gardenInvNo,
                grade,
                totalBags,
            });
        }
    });

    return extracted;
}

// --- SAP HTML report (.htm / .html) -------------------------------------------
// The report has NO <table>: it's a monospace (courier) fixed-width layout, one
// material row per <nobr>, columns padded with &nbsp;. We read column positions
// from the header line (which repeats the "Garden"/"Total" labels) and slice each
// data row by character offset. Validated to reproduce the Excel export exactly.
const decodeHtmlText = (inner) =>
    inner
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&#x2f;/gi, '/')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
        .replace(/[\r\n]+/g, ' ');

// Character ranges of the columns we need, read off a header line. The header
// repeats "Garden" (name, then Inv.No) and "Total" (Bags, then Weight), so we
// walk left-to-right to disambiguate them.
function htmlColumnRanges(h) {
    const iSto = h.indexOf('Sto');
    const iBatch = h.indexOf('Batch', iSto);
    const iGarden1 = h.indexOf('Garden', iBatch);
    const iTea = h.indexOf('Tea', iGarden1);
    const iGarden2 = h.indexOf('Garden', iTea);
    const iGrade = h.indexOf('Grade', iGarden2);
    const iBC = h.indexOf('B/C', iGrade);
    const iTotal = h.indexOf('Total', iGrade);
    const iWt = h.indexOf('Wt', iTotal);
    if ([iSto, iBatch, iGarden1, iTea, iGarden2, iGrade, iBC, iTotal, iWt].some((x) => x < 0)) return null;
    return {
        stoLoc: [iSto, iBatch],
        batchNumber: [iBatch, iGarden1],
        garden: [iGarden1, iTea],
        gardenInvNo: [iGarden2, iGrade],
        grade: [iGrade, iBC],
        totalBags: [iTotal, iWt],
    };
}

function parseHtml(htmlText) {
    const lines = [...htmlText.matchAll(/<nobr\b[^>]*>([\s\S]*?)<\/nobr>/gi)].map((m) => decodeHtmlText(m[1]));
    const slice = (line, range) => line.slice(range[0], range[1]).trim();

    const extracted = [];
    let cols = null;
    let block = 0;
    let rowN = 0;

    lines.forEach((line) => {
        if (line.trim().startsWith('Sto')) {          // header line -> (re)read column positions for this block
            const ranges = htmlColumnRanges(line);
            if (ranges) { cols = ranges; block += 1; }
            return;
        }
        if (!cols) return;

        const stoLoc = slice(line, cols.stoLoc);
        if (!stoLoc || !isAllowedStoLoc(stoLoc)) return;

        const garden = slice(line, cols.garden);
        const gardenInvNo = slice(line, cols.gardenInvNo);
        const grade = slice(line, cols.grade);
        const totalBags = parseInt(slice(line, cols.totalBags), 10);
        if (!isCompleteMaterial(garden, gardenInvNo, grade, totalBags)) return;

        extracted.push({
            id: `html-b${block}-${rowN++}`,
            sheetName: `block${block}`,
            stoLoc,
            batchNumber: slice(line, cols.batchNumber),
            garden,
            gardenInvNo,
            grade,
            totalBags,
        });
    });

    return extracted;
}

// --- Dispatch by file extension; identical pipeline downstream for every format
async function extractMixingRows(file) {
    const name = (file.name || '').toLowerCase();
    let rows;
    if (name.endsWith('.htm') || name.endsWith('.html')) {
        rows = parseHtml(await file.text());
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        rows = parseWorkbook(await file.arrayBuffer());
    } else {
        throw new Error('Unsupported file. Please upload an Excel (.xlsx/.xls) or SAP HTML (.htm/.html) file.');
    }
    return dedupeRows(rows);
}

// Every bin that holds this material (matched on Garden Inv No as primary key with
// soft verification of Grade (strict) and Garden Name (partial/fuzzy match)).
// Same-lot fungibility: any of these bags can be pulled, so we don't track individual tags.
// Every bin that holds this material (matched on Garden Inv No as primary key with
// soft verification of Grade (strict) and Garden Name (partial/fuzzy match)).
// Same-lot fungibility: any of these bags can be pulled, so we don't track individual tags.
function findMatchingBins(item, occupancyDistribution) {
    const result = [];
    const gardenInvNoPrimary = norm(item.gardenInvNo);
    const gradePrimary = norm(item.grade);
    const gardenNamePrimary = norm(item.garden); // Normalized for substring check
    const GARDEN_NAME_THRESHOLD = 0.6; // Slightly lowered to allow flexibility

    if (!occupancyDistribution || occupancyDistribution.length === 0) {
        console.log(`No bins available for ${item.gardenInvNo}`);
        return result;
    }

    for (const bin of occupancyDistribution) {
        const materials = Array.isArray(bin.occupied_materials) ? bin.occupied_materials : [];
        let matchedDbGardenName = null; // Variable to capture the full DB name

        const matchingTags = materials.filter((tag) => {
            if (!isPlaced(tag)) return false;
            const attrs = tag?.attributes || {};
            const gardenInvNoTag = norm(MATERIAL_FIELD.gardenInvNo(attrs));
            const gradeTag = norm(MATERIAL_FIELD.grade(attrs));
            const dbGardenNameRaw = MATERIAL_FIELD.garden(attrs) || '';
            const dbGardenNameNorm = norm(dbGardenNameRaw);

            if (gardenInvNoPrimary !== gardenInvNoTag) {
                return false;
            }
            if (gradePrimary !== gradeTag) {
                console.log(`Grade mismatch for ${gardenInvNoPrimary}: expected '${gradePrimary}' got '${gradeTag}'`);
                return false;
            }
            
            // 1. Check if one name is a substring of the other (Handles KHARIBARI vs KHARIBARI GOLD)
            const isSubstring = dbGardenNameNorm.includes(gardenNamePrimary) || gardenNamePrimary.includes(dbGardenNameNorm);
            
            // 2. If not a substring, fall back to Levenshtein fuzzy match
            if (!isSubstring) {
                const similarity = stringSimilarity(item.garden, dbGardenNameRaw);
                if (similarity < GARDEN_NAME_THRESHOLD) {
                    console.log(`Name mismatch for ${gardenInvNoPrimary}: '${item.garden}' vs '${dbGardenNameRaw}' (sim: ${similarity.toFixed(2)})`);
                    return false;
                }
            }

            // Capture the exact DB name if this is the first matching tag we've found in this bin
            if (!matchedDbGardenName && dbGardenNameRaw) {
                matchedDbGardenName = dbGardenNameRaw;
            }

            return true;
        });
        
        if (matchingTags.length === 0) continue;

        const availableInBin = matchingTags.reduce(
            (sum, tag) => sum + MATERIAL_FIELD.bags(tag?.attributes),
            0
        );
        if (availableInBin <= 0) continue;

        result.push({
            locationCode: BIN_FIELD.locationCode(bin),
            locationName: BIN_FIELD.locationName(bin),
            binAvailableTotal: BIN_FIELD.availableBags(bin),
            availableInBin,
            dbGardenName: matchedDbGardenName || item.garden, // Pass the captured DB name down
        });
    }
    return result;
}

// Spread `need` bags across the bins that hold the material.
// Policy: if a single bin can cover the whole need, use the best-fit (smallest
// sufficient) bin so bins get emptied cleanly and stock stays consolidated.
// Otherwise pull from the largest bins first, so the split uses the fewest bins
// (i.e. the fewest pick trips). Deterministic — same sheet always allocates the
// same way, regardless of the order bins arrive in.
function allocateAcrossBins(need, bins) {
    if (need <= 0 || bins.length === 0) return [];

    const covering = bins
        .filter((b) => b.availableInBin >= need)
        .sort((a, b) => a.availableInBin - b.availableInBin);
    if (covering.length > 0) {
        return [{ ...covering[0], allocated: need }];
    }

    const sorted = [...bins].sort((a, b) => b.availableInBin - a.availableInBin);
    const result = [];
    let remaining = need;
    for (const bin of sorted) {
        if (remaining <= 0) break;
        const take = Math.min(bin.availableInBin, remaining);
        if (take > 0) {
            result.push({ ...bin, allocated: take });
            remaining -= take;
        }
    }
    return result;
}

const RaiseRequest = () => {
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
    const [requests, setRequests] = useState([]);

    const fileInputRef = useRef(null);
    const [isParsing, setIsParsing] = useState(false);
    const [importedItems, setImportedItems] = useState([]);
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
    const [fileName, setFileName] = useState('');
    const [expandedBins, setExpandedBins] = useState(new Set());
    const [selectedBins, setSelectedBins] = useState(new Set()); // Track which bins are checked for submission
    const [deleteTarget, setDeleteTarget] = useState(null); // the request pending delete-confirmation
    const [isDeleting, setIsDeleting] = useState(false);

    const toggleExpandedBin = (locationCode) => {
        setExpandedBins((prev) => {
            const next = new Set(prev);
            next.has(locationCode) ? next.delete(locationCode) : next.add(locationCode);
            return next;
        });
    };

    const toggleBinSelection = (locationCode) => {
        setSelectedBins((prev) => {
            const next = new Set(prev);
            next.has(locationCode) ? next.delete(locationCode) : next.add(locationCode);
            return next;
        });
    };

    const socket = useMemo(() => io(process.env.REACT_APP_API_URL), []);
    const dispatch = useDispatch();
    const { loading, occupancyDistribution } = useSelector((state) => state.materialMovement);

    useEffect(() => {
        let mounted = true;
        fetchPendingRaiseRequests()
            .then((res) => {
                if (mounted) setRequests(res?.data || []);
            })
            .catch((err) => console.error("Failed to load pending requests:", err));
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        socket.on("new-request-broadcast", (newRequest) => {
            setRequests((prev) => [newRequest, ...prev]);
        });
        socket.on("request-deleted", ({ raise_id }) => {
            setRequests((prev) => prev.filter((r) => r.raise_id !== raise_id));
        });
        return () => {
            socket.off("new-request-broadcast");
            socket.off("request-deleted");
            socket.disconnect();
        };
    }, [socket]);

    useEffect(() => {
        dispatch(fetchOccupancyDistribution());
    }, [dispatch]);

    const handleFileButtonClick = () => fileInputRef.current?.click();

const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setIsParsing(true);
        setImportedItems([]);
        try {
            const extracted = await extractMixingRows(file);
            console.log('Extracted rows:', extracted);
            console.log('Occupancy Distribution:', occupancyDistribution);

            const allocationItems = [];
            extracted.forEach((item) => {
                const bins = findMatchingBins(item, occupancyDistribution);
                if (bins.length === 0) {
                    console.log(`No bins found for: ${item.gardenInvNo} | ${item.grade} | ${item.garden}`);
                }
                const totalAvailable = bins.reduce((sum, b) => sum + b.availableInBin, 0);
                const toFulfill = Math.min(item.totalBags, totalAvailable);
                const shortfall = item.totalBags - toFulfill;

                if (bins.length === 0 || toFulfill <= 0) {
                    allocationItems.push({
                        ...item,
                        rowId: item.id,
                        matched: false,
                        locationCode: null,
                        availableInBin: 0,
                        binAvailableTotal: 0,
                        requestBags: 0,
                        shortfall: item.totalBags,
                    });
                    return;
                }

                allocateAcrossBins(item.totalBags, bins).forEach((alloc) => {
                    allocationItems.push({
                        ...item,
                        // Override the excel name with the real DB name we captured
                        garden: alloc.dbGardenName, 
                        rowId: item.id,
                        id: `${item.id}::${alloc.locationCode}`,
                        matched: true,
                        locationCode: alloc.locationCode,
                        locationName: alloc.locationName,
                        binAvailableTotal: alloc.binAvailableTotal,
                        availableInBin: alloc.availableInBin,
                        requestBags: alloc.allocated,
                        shortfall, 
                    });
                });
            });

            setImportedItems(allocationItems);

            // Auto-select all bins on successful file import
            const newBinCodes = new Set();
            const binMap = new Map();
            allocationItems.forEach((item) => {
                if (item.matched && item.locationCode && !binMap.has(item.locationCode)) {
                    binMap.set(item.locationCode, true);
                    newBinCodes.add(item.locationCode);
                }
            });
            setSelectedBins(newBinCodes);

            if (extracted.length === 0) {
                setNotification({ open: true, message: `No rows found for the allowed godowns (${ALLOWED_GODOWNS.join(', ')}) in this file.`, severity: 'error' });
            }
        } catch (err) {
            console.error('Failed to parse file:', err);
            setNotification({ open: true, message: 'Could not read the file. Please check the format.', severity: 'error' });
        } finally {
            setIsParsing(false);
            e.target.value = '';
        }
    };

    // Counts are per sheet row, not per line item (a matched row may span bins).
    const matchedCount = new Set(importedItems.filter((i) => i.matched).map((i) => i.rowId)).size;
    const unmatchedItems = importedItems.filter((i) => !i.matched);
    const unmatchedCount = unmatchedItems.length;
    const shortByRow = new Map();
    importedItems.forEach((i) => {
        if (i.matched && i.shortfall > 0) shortByRow.set(i.rowId, i.shortfall);
    });
    const shortCount = shortByRow.size;
    const shortBags = Array.from(shortByRow.values()).reduce((sum, n) => sum + n, 0);

    const groupedByBin = useMemo(() => {
        const map = new Map();
        importedItems.forEach((item) => {
            if (!item.matched || item.requestBags <= 0) return;
            const key = item.locationCode;
            if (!map.has(key)) {
                map.set(key, {
                    locationCode: item.locationCode,
                    locationName: item.locationName,
                    binAvailableTotal: item.binAvailableTotal,
                    totalBags: 0,
                    items: [],
                });
            }
            const group = map.get(key);
            group.totalBags += item.requestBags;
            group.items.push(item);
        });
        return Array.from(map.values());
    }, [importedItems]);

    const handleBulkSubmit = async () => {
        const selectedGroups = groupedByBin.filter((g) => selectedBins.has(g.locationCode));
        if (selectedGroups.length === 0) return;

        setIsBulkSubmitting(true);
        let successCount = 0;
        let failCount = 0;
        const successfulLocationCodes = new Set();

        for (const group of selectedGroups) {
            try {
                await dispatch(createNewRaiseRequest({
                    location: group.locationCode,
                    no_of_bags: group.totalBags,
                    available_bags: group.binAvailableTotal,
                    materials: group.items.map((mat) => ({
                        garden: mat.garden,
                        garden_inv_no: mat.gardenInvNo,
                        grade: mat.grade,
                        bags_to_remove: mat.requestBags,
                    })),
                })).unwrap();
                successCount += 1;
                successfulLocationCodes.add(group.locationCode);
            } catch (err) {
                console.error(`Failed to create request for ${group.locationCode}:`, err);
                failCount += 1;
            }
        }

        setIsBulkSubmitting(false);
        setNotification({
            open: true,
            message: `${successCount} bin request(s) created${failCount ? `, ${failCount} failed` : ''}.`,
            severity: failCount ? 'error' : 'success',
        });
        setImportedItems((prev) => prev.filter((i) => !(i.matched && successfulLocationCodes.has(i.locationCode))));
        setSelectedBins(new Set()); // Clear selection after submission
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteRaiseRequest(deleteTarget.raise_id);
            // Remove locally right away; the server also broadcasts so every other client drops it.
            setRequests((prev) => prev.filter((r) => r.raise_id !== deleteTarget.raise_id));
            setNotification({ open: true, message: 'Request deleted.', severity: 'success' });
            setDeleteTarget(null);
        } catch (err) {
            setNotification({ open: true, message: err.message || 'Failed to delete request.', severity: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" mt={5}><CircularProgress /></Box>;

    return (
        <Box sx={{ width: '100%', mx: 'auto', mt: 4, px: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper elevation={3} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 4 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>Raise Outward Request</Typography>
                        <Tooltip title="Refresh bin stock before matching">
                            <IconButton onClick={() => dispatch(fetchOccupancyDistribution())}>
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Upload your mixing sheet — either the Excel file (.xlsx) or the SAP HTML export (.htm).
                        We'll read the materials it lists, match them against the bags currently in your bins, and
                        prepare outward requests grouped by bin. If a material is spread across several bins, we
                        source it from as few bins as possible. Anything not found in stock is listed separately for review.
                    </Typography>

                    <input
                        type="file"
                        accept=".xlsx,.xls,.htm,.html"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Button
                            variant="outlined"
                            startIcon={isParsing ? <CircularProgress size={18} /> : <UploadFileIcon />}
                            onClick={handleFileButtonClick}
                            disabled={isParsing}
                        >
                            {isParsing ? 'Reading file...' : 'Upload Excel / HTML File'}
                        </Button>
                        {fileName && <Typography variant="body2" color="text.secondary">{fileName}</Typography>}
                    </Stack>

                    {importedItems.length > 0 && (
                        <>
                            <Divider sx={{ my: 3 }} />
                            <Stack direction="row" spacing={1} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
                                <Chip icon={<CheckCircleIcon />} color="success" label={`${matchedCount} matched`} />
                                {shortCount > 0 && <Chip icon={<WarningIcon />} color="warning" label={`${shortCount} short on stock (${shortBags} bags)`} />}
                                {unmatchedCount > 0 && <Chip icon={<CancelIcon />} color="error" variant="outlined" label={`${unmatchedCount} unmatched (excluded)`} />}
                            </Stack>

                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                Requests to raise (grouped by bin)
                            </Typography>
                            {groupedByBin.length === 0 ? (
                                <Alert severity="warning" sx={{ mb: 2 }}>No matched materials to request yet.</Alert>
                            ) : (
                                <TableContainer sx={{ maxHeight: 420, mb: 3 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell padding="checkbox" />
                                                <TableCell />
                                                <TableCell>Bin</TableCell>
                                                <TableCell>Bin Name</TableCell>
                                                <TableCell align="right">Materials</TableCell>
                                                <TableCell align="right">Bags to Move</TableCell>
                                                <TableCell align="right">In Bin</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {groupedByBin.map((group) => {
                                                const isOpen = expandedBins.has(group.locationCode);
                                                return (
                                                    <React.Fragment key={group.locationCode}>
                                                        <TableRow hover>
                                                            <TableCell padding="checkbox">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedBins.has(group.locationCode)}
                                                                    onChange={() => toggleBinSelection(group.locationCode)}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <IconButton size="small" onClick={() => toggleExpandedBin(group.locationCode)}>
                                                                    {isOpen ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                                                                </IconButton>
                                                            </TableCell>
                                                            <TableCell><Chip size="small" color="primary" label={group.locationCode} /></TableCell>
                                                            <TableCell>{group.locationName}</TableCell>
                                                            <TableCell align="right">{group.items.length}</TableCell>
                                                            <TableCell align="right">{group.totalBags}</TableCell>
                                                            <TableCell align="right">{group.binAvailableTotal}</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell colSpan={7} sx={{ py: 0, borderBottom: isOpen ? undefined : 'none' }}>
                                                                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                                                    <Box sx={{ my: 2, ml: 5 }}>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            Materials making up this request:
                                                                        </Typography>
                                                                        <Table size="small">
                                                                            <TableHead>
                                                                                <TableRow>
                                                                                    <TableCell>Garden</TableCell>
                                                                                    <TableCell>Garden Inv.No</TableCell>
                                                                                    <TableCell>Grade</TableCell>
                                                                                    <TableCell align="right">Bags Needed</TableCell>
                                                                                    <TableCell align="right">Available Here</TableCell>
                                                                                    <TableCell align="right">Bags to Move</TableCell>
                                                                                </TableRow>
                                                                            </TableHead>
                                                                            <TableBody>
                                                                                {group.items.map((mat) => (
                                                                                    <TableRow key={mat.id}>
                                                                                        <TableCell>{mat.garden}</TableCell>
                                                                                        <TableCell>{mat.gardenInvNo}</TableCell>
                                                                                        <TableCell>{mat.grade}</TableCell>
                                                                                        <TableCell align="right">
                                                                                            {mat.shortfall > 0
                                                                                                ? <Typography variant="body2" color="warning.main">{mat.totalBags} (short {mat.shortfall})</Typography>
                                                                                                : mat.totalBags}
                                                                                        </TableCell>
                                                                                        <TableCell align="right">{mat.availableInBin}</TableCell>
                                                                                        <TableCell align="right">{mat.requestBags}</TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </Box>
                                                                </Collapse>
                                                            </TableCell>
                                                        </TableRow>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}

                            {unmatchedCount > 0 && (
                                <>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                        Unmatched rows (not included in any request)
                                    </Typography>
                                    <TableContainer sx={{ maxHeight: 280, mb: 2 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Sto.Loc</TableCell>
                                                    <TableCell>Garden</TableCell>
                                                    <TableCell>Garden Inv.No</TableCell>
                                                    <TableCell>Grade</TableCell>
                                                    <TableCell align="right">Bags Needed</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {unmatchedItems.map((item) => (
                                                    <TableRow key={item.id} hover>
                                                        <TableCell>{item.stoLoc}</TableCell>
                                                        <TableCell>{item.garden}</TableCell>
                                                        <TableCell>{item.gardenInvNo}</TableCell>
                                                        <TableCell>{item.grade}</TableCell>
                                                        <TableCell align="right">{item.totalBags}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            )}

                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    disabled={isBulkSubmitting || selectedBins.size === 0}
                                    endIcon={isBulkSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                    onClick={handleBulkSubmit}
                                >
                                    {isBulkSubmitting ? 'Submitting...' : `Submit ${selectedBins.size} Bin Request(s)`}
                                </Button>
                            </Box>
                        </>
                    )}
                </CardContent>
            </Paper>
            <Paper elevation={2} sx={{ borderRadius: 2, p: 2 }}>
                <Typography variant="h6" sx={{ p: 2, fontWeight: 600 }}>Live Broadcast Requests</Typography>
                <List sx={{ width: '100%', bgcolor: 'background.paper', maxHeight: 400, overflow: 'auto' }}>
                    {requests.map((req, index) => (
                        <ListItem
                            key={req.raise_id ?? index}
                            divider
                            alignItems="flex-start"
                            secondaryAction={
                                <Tooltip title="Delete request">
                                    <IconButton edge="end" color="error" onClick={() => setDeleteTarget(req)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </Tooltip>
                            }
                            sx={{ pr: 7 }}
                        >
                            <ListItemAvatar><Avatar sx={{ bgcolor: 'primary.main' }}><ShippingIcon /></Avatar></ListItemAvatar>
                            <ListItemText
                                primary={`Bin: ${req.location}`}
                                secondaryTypographyProps={{ component: 'div' }}
                                secondary={
                                    <>
                                        <Typography variant="body2" color="text.secondary" component="span">
                                            {`${req.bags_to_remove ?? req.no_of_bags} / ${req.available_bags} Bags | Status: ${req.status || 'Pending'} | ${req.created_at ? new Date(req.created_at).toLocaleString() : ''}`}
                                        </Typography>
                                        {Array.isArray(req.materials) && req.materials.length > 0 && (
                                            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                                                {req.materials.map((mat, mIdx) => (
                                                    <Chip
                                                        key={mIdx}
                                                        size="small"
                                                        variant="outlined"
                                                        label={`${mat.garden} · ${mat.grade} · ${mat.garden_inv_no} — ${mat.bags_to_remove} bags`}
                                                    />
                                                ))}
                                            </Stack>
                                        )}
                                    </>
                                }
                            />
                        </ListItem>
                    ))}
                    {requests.length === 0 && <ListItem><ListItemText secondary="No live requests yet..." /></ListItem>}
                </List>
            </Paper>

            <Dialog open={Boolean(deleteTarget)} onClose={() => { if (!isDeleting) setDeleteTarget(null); }}>
                <DialogTitle>Delete this request?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {deleteTarget
                            ? `Delete the outward request for bin "${deleteTarget.location}" (${deleteTarget.bags_to_remove ?? deleteTarget.no_of_bags} bags)? This removes it for everyone and can't be undone.`
                            : ''}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
                    <Button
                        onClick={handleConfirmDelete}
                        color="error"
                        variant="contained"
                        disabled={isDeleting}
                        startIcon={isDeleting ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })}>
                <Alert severity={notification.severity} variant="filled">{notification.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default RaiseRequest;
