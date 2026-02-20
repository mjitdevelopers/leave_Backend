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
// ================= APPLY LEAVE (SECURE VERSION) =================
router.post("/apply", async (req, res) => {
  try {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ message: "No Token" });

    const { leaveType, fromDate, toDate, reason } = req.body;

    if (!leaveType || !fromDate || !toDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    const today = new Date();
    const normalizedToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    // ❌ Past date block
    if (start < normalizedToday) {
      return res.status(400).json({
        message: "Cannot apply leave for past dates",
      });
    }

    // ❌ To < From block
    if (end < start) {
      return res.status(400).json({
        message: "To Date cannot be before From Date",
      });
    }

    // ❌ Half Day rule
    if (leaveType === "Half Day" && start.getTime() !== end.getTime()) {
      return res.status(400).json({
        message: "Half Day leave must be same day",
      });
    }

    // ❌ OVERLAPPING CHECK
    const overlappingLeave = await Leave.findOne({
      user: user._id,
      status: { $ne: "Rejected" }, // ignore rejected
      $or: [
        {
          fromDate: { $lte: end },
          toDate: { $gte: start },
        },
      ],
    });

    if (overlappingLeave) {
      return res.status(400).json({
        message: "You already have leave applied for selected dates",
      });
    }

    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await Leave.create({
      user: user._id,
      leaveType,
      fromDate: start,
      toDate: end,
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

// ================= ADMIN: ALL LEAVES (SHOW ALL + OPTIONAL DATE FILTER) =================
router.get("/all", async (req, res) => {
  try {
    // 🔐 Verify admin
    const user = await verifyToken(req);
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access Denied" });
    }

    const { date } = req.query;

    let filter = {};

    // ✅ If date is provided → filter by that date
    if (date) {
      const selectedDate = new Date(date);

      filter = {
        fromDate: { $lte: selectedDate },
        toDate: { $gte: selectedDate },
      };
    }

    const leaves = await Leave.find(filter)
      .populate("user", "name email department")
      .sort({ createdAt: -1 }); // newest first

    res.json(leaves);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

// ================= ADMIN: APPROVE / REJECT =================
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
    leave.adminComment = adminComment || "";
    await leave.save();

    // 🔔 Enhanced Notification
    await Notification.create({
      user: leave.user._id,
      title: "Leave Status Updated",
      message: `Your ${leave.leaveType} leave (${leave.fromDate.toISOString().split("T")[0]} - ${leave.toDate.toISOString().split("T")[0]}) has been ${status}. ${adminComment ? "Comment: " + adminComment : ""}`,
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
