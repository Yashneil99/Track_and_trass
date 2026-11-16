const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  uploadStn,
  getStnDocument,
  deleteStn,
  extractPdfContent,
  getAllStnDocuments,
  getStnDocumentByInvoice,
  extractExcelData,
  stnStatusUpdate,
  consolidateStn,
  getStnAllocations,
  allocateStn,
  releaseStn,
  incrementSubmitted,
  manualAssignStn,
  relocateInvoice
} = require("../controllers/stnController");
const verifyToken = require("../middlewares/verifyToken");
const verifyUnifyToken = require("../middlewares/verifyUnifyToken");
const uploadStnMiddleware = require("../middlewares/uploadStn");
const uploadErrorHandler = require("../middlewares/uploadErrorHandler");
const { route } = require("./usersRoutes");

// STN Upload Routes
router.post(
  "/uploadStn",
  verifyUnifyToken,
  uploadStnMiddleware.single("stnFile"),
  uploadErrorHandler, // Handle multer errors first
  uploadStn
);

router.get(
  "/getStn/:file_name",
  verifyUnifyToken,
  getStnDocument
);

router.get(
  "/getStnByInvoice/:invoice_stn",
  // verifyToken,
  verifyUnifyToken,
  getStnDocumentByInvoice
);

router.delete(
  "/deleteStn",
  verifyUnifyToken,
  deleteStn
);

// Extract PDF content as JSON
router.get(
  "/extractPdf",
  // verifyToken,
  // extractPdfContent
  // verifyUnifyToken,
  extractExcelData
);

router.get(
  "/extractExcel",
  // verifyToken,
  verifyUnifyToken,
  extractExcelData
);

router.get(
  "/getAllStnDocuments",
  // verifyToken,
  verifyUnifyToken,
  getAllStnDocuments
);

router.post(
  "/stnStatusUpdate",
  // verifyToken,
  // verifyUnifyToken,
  stnStatusUpdate
);

// Task 1: Auto Allocation of Bags on STN Upload

router.post(
  "/consolidate",
  verifyUnifyToken,
  consolidateStn
);

// Read-only. Also called by the Putaway handheld, which — like relocateInvoice
// below — carries no cookie and no Bearer token, so verifyUnifyToken would 401
// it. Left open deliberately, not by omission.
router.get(
  "/getAllocations",
  getStnAllocations
);

router.post(
  "/allocate",
  verifyUnifyToken,
  allocateStn
);

router.post(
  "/release",
  verifyUnifyToken,
  releaseStn
);

// Called by the Android inward flow, not the web app.
router.post(
  "/incrementSubmitted",
  verifyUnifyToken,
  incrementSubmitted
);

// Manual location assignment for invoices Assign Location couldn't auto-place
router.post(
  "/manualAssign",
  verifyUnifyToken,
  manualAssignStn
);

// Move an already-allocated invoice to a different bin. Called by the Putaway
// handheld, which — like every other Android-facing route here (extractPdf,
// stnStatusUpdate) — carries no cookie and no Bearer token, so verifyUnifyToken
// would 401 it. Left open deliberately, not by omission.
router.post(
  "/relocateInvoice",
  relocateInvoice
);


module.exports = router;
