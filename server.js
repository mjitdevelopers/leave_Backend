const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Attendance = require("./models/Attendance");
const path = require("path");
const taskRoutes = require("./routes/taskRoutes");
const companyExpenseRoutes = require("./routes/companyExpenseRoutes");

// ✅ ADD THIS LINE
const salaryRoutes = require("./routes/salaryRoutes");

dotenv.config();
// 🔴 GLOBAL ERROR HANDLER ADD HERE
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION:", err);
});
connectDB();
const app = express();

app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json());

// Security
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/leave", require("./routes/leaveRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/documents", require("./routes/documentRoutes"));
app.use("/api/tasks", taskRoutes);
app.use("/api/company-expense", companyExpenseRoutes);

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
    const { latitude, longitude } = req.body; // ✅ time काढलं

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No Token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    const officeLat = 17.706929;
    const officeLng = 73.980166;

    const distance = getDistanceFromLatLonInMeters(
      latitude,
      longitude,
      officeLat,
      officeLng,
    );

    if (distance > 500) {
      return res.status(400).json({
        message: "You are not at Office Location",
      });
    }

    // ✅ FIXED TIME
    const now = new Date();

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const existing = await Attendance.findOne({
      user: user._id,
      date: today,
    });

    if (existing) {
      return res.status(400).json({
        message: "Already Checked In",
      });
    }

    const hour = now.getHours();
    const minute = now.getMinutes();

    let status = "Present";

    if (hour > 10 || (hour === 10 && minute > 30)) {
      status = "Late";
    }

    await Attendance.create({
      user: user._id,
      date: today,
      checkIn: now, // ✅ DATE SAVE होईल
      status,
      latitude,
      longitude,
      locationName: "MJIT Solutions Office",
    });

    res.json({
      message: "Check-In Successful",
      status,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});
// ================= CHECK-OUT =================
app.post("/api/attendance/checkout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { time } = req.body;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No Token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    const now = new Date();

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const attendance = await Attendance.findOne({
      user: user._id,
      date: today,
    });

    if (!attendance) {
      return res.status(400).json({
        message: "Check-In First",
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        message: "Already Checked Out",
      });
    }

    // optional remove restriction for testing
    // if (now.getHours() < 18) return...

    attendance.checkOut = now; // 🔥 DATE TYPE

    await attendance.save();

    res.json({
      message: "Check-Out Successful",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});
// ================= GET TODAY ATTENDANCE (EMPLOYEE SELF) =================
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
        let workingHours = "0.00";

        if (record.checkIn && record.checkOut) {
          // ✅ ISO time direct use
          const start = new Date(record.checkIn);
          const end = new Date(record.checkOut);

          const diff = (end - start) / (1000 * 60 * 60);
          workingHours = diff.toFixed(2);
        }

        fullMonthData.push({
          date: formatted,
          status: record.status,

          // ✅ UI friendly time
          checkIn: record.checkIn
            ? new Date(record.checkIn).toLocaleTimeString()
            : null,

          checkOut: record.checkOut
            ? new Date(record.checkOut).toLocaleTimeString()
            : null,

          workingHours: workingHours,
        });
      } else {
        fullMonthData.push({
          date: formatted,
          status: "Absent",
          checkIn: null,
          checkOut: null,
          workingHours: "0.00",
        });
      }
    }

    res.json(fullMonthData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// ================= ADMIN VIEW ATTENDANCE =================
app.get("/api/attendance", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await User.findById(decoded.id);

    if (!admin || admin.role !== "ADMIN") {
      return res.status(403).json({ message: "Access Denied" });
    }

    const selectedDate =
      req.query.date ||
      new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });

    const allUsers = await User.find({ role: { $ne: "ADMIN" } });

    const records = await Attendance.find({ date: selectedDate }).populate(
      "user",
      "name email",
    );

    const finalData = allUsers.map((user) => {
      const record = records.find(
        (r) => r.user._id.toString() === user._id.toString(),
      );

      if (record) {
        return {
          user,
          date: selectedDate,
          status: record.status,

          // ✅ IST TIME FIX
          checkIn: formatISTTime(record.checkIn),
          checkOut: formatISTTime(record.checkOut),

          // ✅ WORKING HOURS FIX
          workingHours: calculateWorkingHours(record.checkIn, record.checkOut),
        };
      }

      return {
        user,
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
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await User.findById(decoded.id);

    if (!admin || admin.role !== "ADMIN") {
      return res.status(403).json({ message: "Access Denied" });
    }

    const { month, year } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const start = startDate.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const end = endDate.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const records = await Attendance.find({
      user: req.params.id,
      date: { $gte: start, $lte: end },
    });

    let fullMonthData = [];

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const formatted = d.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });

      const record = records.find((r) => r.date === formatted);

      if (record) {
        fullMonthData.push({
          date: formatted,
          status: record.status,

          // ✅ IST TIME FIX
          checkIn: formatISTTime(record.checkIn),
          checkOut: formatISTTime(record.checkOut),

          // ✅ WORKING HOURS FIX
          workingHours: calculateWorkingHours(record.checkIn, record.checkOut),
        });
      } else {
        fullMonthData.push({
          date: formatted,
          status: "Absent",
          checkIn: null,
          checkOut: null,
          workingHours: "0.00",
        });
      }
    }

    res.json(fullMonthData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});
const PORT = process.env.PORT || 6004;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
