const express = require("express");
const router = express.Router();
const multer = require("multer");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const User = require("../models/User");

// ================= MULTER SETUP =================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ================= UPLOAD PROFILE PHOTO =================
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No Token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    // Delete old photo if exists
    if (user.profileImage) {
      const oldPath = "uploads/" + user.profileImage;
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    user.profileImage = req.file.filename;
    await user.save();

    res.json({
      message: "Profile Image Updated",
      image: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= GET PROFILE =================
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No Token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    res.json({
      name: user.name,
      profileImage: user.profileImage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= DELETE PROFILE PHOTO =================
router.delete("/delete-photo", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No Token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (user.profileImage) {
      const filePath = "uploads/" + user.profileImage;

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      user.profileImage = null;
      await user.save();
    }

    res.json({ message: "Profile Photo Deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
