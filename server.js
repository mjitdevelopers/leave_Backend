const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Attendance = require("./models/Attendance");

// ✅ ADD THIS LINE
const salaryRoutes = require("./routes/salaryRoutes");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/leave", require("./routes/leaveRoutes"));

// ✅ ADD THIS LINE
app.use("/api/salary", salaryRoutes);

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
    if (distance > 200) {
      return res.status(400).json({
        message: "You are not at Office Location",
      });
    }

    const today = new Date().toISOString().split("T")[0];

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

    const today = new Date().toISOString().split("T")[0];

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
      return res.status(403).json({ message: "Access Denied" });
    }

    // ✅ DATE FROM QUERY
    const { date } = req.query;
    const selectedDate = date || new Date().toISOString().split("T")[0];

    // 🔥 GET ALL USERS
    const allUsers = await User.find({ role: { $ne: "ADMIN" } });

    // 🔥 GET ATTENDANCE OF SELECTED DATE
    const records = await Attendance.find({ date: selectedDate }).populate(
      "user",
      "name email role",
    );

    // 🔥 MAP USER-WISE ATTENDANCE
    const finalData = allUsers.map((user) => {
      const userAttendance = records.find(
        (r) => r.user._id.toString() === user._id.toString(),
      );

      // 🔹 If attendance exists
      if (userAttendance) {
        let workingHours = "In Progress";

        if (userAttendance.checkIn && userAttendance.checkOut) {
          const start = new Date(`1970-01-01T${userAttendance.checkIn}`);
          const end = new Date(`1970-01-01T${userAttendance.checkOut}`);

          const diffMs = end - start;
          const diffHrs = diffMs / (1000 * 60 * 60);

          workingHours = diffHrs.toFixed(2);
        }

        return {
          user: user,
          date: selectedDate,
          status: userAttendance.status,
          checkIn: userAttendance.checkIn,
          checkOut: userAttendance.checkOut,
          workingHours: workingHours,
        };
      }

      // 🔹 If NO attendance → ABSENT
      return {
        user: user,
        date: selectedDate,
        status: "Absent",
        checkIn: null,
        checkOut: null,
        workingHours: "0.00",
      };
    });

    res.json(finalData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});
// ================= ADMIN: EMPLOYEE FULL MONTH ATTENDANCE (PRESENT + LATE + ABSENT) =================
// ================= ADMIN: EMPLOYEE MONTH-WISE ATTENDANCE =================
app.get("/api/attendance/employee/:id", async (req, res) => {
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

    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and Year required" });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await Attendance.find({
      user: req.params.id,
      date: {
        $gte: startDate.toISOString().split("T")[0],
        $lte: endDate.toISOString().split("T")[0],
      },
    });

    let fullMonthData = [];

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const formatted = d.toISOString().split("T")[0];

      const record = records.find((r) => r.date === formatted);

      if (record) {
        fullMonthData.push({
          date: formatted,
          status: record.status,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
        });
      } else {
        fullMonthData.push({
          date: formatted,
          status: "Absent",
          checkIn: null,
          checkOut: null,
        });
      }
    }

    res.json(fullMonthData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
