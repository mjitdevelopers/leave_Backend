const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const controller = require("../controllers/documentController");

// ADD DOCUMENT
router.post("/", upload.single("file"), controller.addDocument);

// GET DOCUMENTS
router.get("/:employeeId", controller.getDocuments);

// DELETE DOCUMENT  ✅ ADD THIS
router.delete("/:id", controller.deleteDocument);

module.exports = router;
