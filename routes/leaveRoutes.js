const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Leave = require("../models/Leave");
const User = require("../models/User");
const Notification = require("../models/Notification");

// 🔐 TOKEN VERIFY FUNCTION
const verifyToken = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  return await User.findById(decoded.id);
};

// ================= APPLY LEAVE =================
router.post("/apply", async (req, res) => {
  try {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ message: "No Token" });

    const { leaveType, fromDate, toDate, reason } = req.body;

    const start = new Date(fromDate);
    const end = new Date(toDate);

    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await Leave.create({
      user: user._id,
      leaveType,
      fromDate,
      toDate,
      totalDays: diff,
      reason,
    });

    res.status(201).json({
      message: "Leave Applied Successfully",
      leave,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= MY LEAVES =================
router.get("/my", async (req, res) => {
  try {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ message: "No Token" });

    const leaves = await Leave.find({ user: user._id }).sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= ADMIN: ALL LEAVES (DATE FILTER FIXED) =================
router.get("/all", async (req, res) => {
  try {
    const user = await verifyToken(req);
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access Denied" });
    }

    const { date } = req.query;

    let filter = {};

    if (date) {
      const selectedDate = new Date(date);

      filter = {
        fromDate: { $lte: selectedDate },
        toDate: { $gte: selectedDate },
      };
    }

    const leaves = await Leave.find(filter)
      .populate("user", "name email department")
      .sort({ fromDate: -1 });

    res.json(leaves);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

// ================= ADMIN: APPROVE / REJECT =================
router.put("/:id", async (req, res) => {
  try {
    const user = await verifyToken(req);
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access Denied" });
    }

    const { status, adminComment } = req.body;

    const leave = await Leave.findById(req.params.id).populate("user");

    if (!leave) {
      return res.status(404).json({ message: "Leave Not Found" });
    }

    leave.status = status;
    leave.adminComment = adminComment;

    await leave.save();

    // 🔔 CREATE NOTIFICATION FOR EMPLOYEE
    await Notification.create({
      user: leave.user._id,
      title: "Leave Status Updated",
      message: `Your ${leave.leaveType} leave has been ${status}`,
    });

    res.json({ message: "Leave Updated Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// ================= GET MY NOTIFICATIONS =================
router.get("/notifications", async (req, res) => {
  try {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ message: "No Token" });

    const notifications = await Notification.find({
      user: user._id,
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
