const Document = require("../models/Document");
const fs = require("fs");
const path = require("path");
exports.addDocument = async (req, res) => {
  try {
    const { employeeId, title } = req.body;

    const newDoc = await Document.create({
      employeeId,
      title,
      filePath: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
    });

    res.status(201).json(newDoc);
  } catch (error) {
    res.status(500).json({ message: "Upload Failed" });
  }
};

exports.getDocuments = async (req, res) => {
  const docs = await Document.find({
    employeeId: req.params.employeeId,
  });
  res.json(docs);
};
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // 🔥 Correct absolute path
    const filePath = path.join(__dirname, "..", doc.filePath);

    console.log("Deleting file:", filePath);

    // Delete file from uploads folder
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("File deleted from folder");
    } else {
      console.log("File not found in folder");
    }

    // Delete from MongoDB
    await Document.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Deleted Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Delete Failed" });
  }
};
