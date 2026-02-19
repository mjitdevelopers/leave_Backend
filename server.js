const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Attendance = require("./models/Attendance");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/leave", require("./routes/leaveRoutes"));

// ================= GET ALL USERS (ADMIN ONLY) =================
app.get("/api/users", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No Token" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await User.findById(decoded.id);

    if (!admin || admin.role !== "ADMIN") {
      return res.status(403).json({ message: "Access Denied" });
    }

    const users = await User.find().select("name email role department");

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= DELETE USER (ADMIN ONLY) =================
app.delete("/api/users/:id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No Token" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await User.findById(decoded.id);

    if (!admin || admin.role !== "ADMIN") {
      return res.status(403).json({ message: "Access Denied" });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "User Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// ================= ATTENDANCE SECTION =======================
// ============================================================

// 📍 Distance Calculator (Meters)
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const toRad = (x) => (x * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// ================= CHECK-IN =================
app.post("/api/attendance/checkin", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { latitude, longitude } = req.body;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No Token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    // 🔥 MJIT OFFICE LOCATION
    const officeLat = 17.706828;
    const officeLng = 73.980128;

    const distance = getDistanceFromLatLonInMeters(
      latitude,
      longitude,
      officeLat,
      officeLng,
    );

    // 🔒 100 meters allowed
    if (distance > 100) {
      return res.status(400).json({
        message: "You are not at Office Location",
      });
    }

    const today = new Date().toLocaleDateString();

    const existing = await Attendance.findOne({
      user: user._id,
      date: today,
    });

    if (existing) {
      return res.status(400).json({
        message: "Already Checked In",
      });
    }

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    let status = "Present";

    // ⏰ Late after 10:30 AM
    if (hour > 10 || (hour === 10 && minute > 30)) {
      status = "Late";
    }

    await Attendance.create({
      user: user._id,
      date: today,
      checkIn: now.toLocaleTimeString(),
      status: status,
      latitude: latitude,
      longitude: longitude,
      locationName: "MJIT Solutions Office",
    });

    res.json({
      message: "Check-In Successful",
      status: status,
      distanceInMeters: Math.round(distance),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= CHECK-OUT =================
app.post("/api/attendance/checkout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No Token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    const today = new Date().toLocaleDateString();

    const attendance = await Attendance.findOne({
      user: user._id,
      date: today,
    });

    if (!attendance) {
      return res.status(400).json({
        message: "Check-In First",
      });
    }

    const now = new Date();

    if (now.getHours() < 18) {
      return res.status(400).json({
        message: "Checkout allowed after 6 PM",
      });
    }

    attendance.checkOut = now.toLocaleTimeString();
    await attendance.save();

    res.json({
      message: "Check-Out Successful",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= ADMIN VIEW ATTENDANCE =================
app.get("/api/attendance", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No Token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await User.findById(decoded.id);

    if (!admin || admin.role !== "ADMIN") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const data = await Attendance.find().populate("user", "name email role");

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
