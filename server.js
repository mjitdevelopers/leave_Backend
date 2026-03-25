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
const attendanceRoutes = require("./routes/attendanceRoutes");

// ✅ ADD THIS LINE
const salaryRoutes = require("./routes/salaryRoutes");

dotenv.config({ path: "./.env" });
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
// ✅ ADD THIS (API LOGGING)
app.use((req, res, next) => {
  console.log("API HIT:", req.method, req.url);
  next();
});
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
app.use("/api/attendance", attendanceRoutes);
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
const PORT = process.env.PORT || 6004;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
