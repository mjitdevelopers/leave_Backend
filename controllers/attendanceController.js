const Attendance = require("../models/Attendance");
const moment = require("moment-timezone");
const { getISTTime, getDistance } = require("../utils/helper");
const User = require("../models/User"); // ✅ ADD THIS

// 📍 Office Location (UPDATED)
const OFFICE_LAT = 17.706929;
const OFFICE_LON = 73.980166;

// ✅ CHECK-IN
exports.checkIn = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const distance = getDistance(latitude, longitude, OFFICE_LAT, OFFICE_LON);
    if (distance > 200) {
      return res.status(400).json({
        msg: `You are ${Math.round(distance)}m away from office ❌`,
      });
    }

    const now = getISTTime();
    const date = now.format("YYYY-MM-DD");

    const existing = await Attendance.findOne({
      user: req.user.id,
      date,
    });

    if (existing) {
      return res.status(400).json({ msg: "Already checked-in ❌" });
    }

    // ✅ Present / Late logic
    const status =
      now.hour() < 10 || (now.hour() === 10 && now.minute() <= 30)
        ? "Present"
        : "Late";

    const attendance = new Attendance({
      user: req.user.id,
      date,
      checkIn: now.format("HH:mm:ss"),
      status,
    });

    await attendance.save();

    res.json({ msg: "Check-in successful ✅", attendance });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const now = getISTTime();
    const date = now.format("YYYY-MM-DD");

    const attendance = await Attendance.findOne({
      user: req.user.id,
      date,
    });

    if (!attendance) {
      return res.status(400).json({ msg: "No check-in found ❌" });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ msg: "Already checked-out ❌" });
    }

    attendance.checkOut = now.format("HH:mm:ss");

    // ✅ Working hours
    const checkIn = moment(attendance.checkIn, "HH:mm:ss");
    const checkOut = moment(attendance.checkOut, "HH:mm:ss");

    const diff = moment.duration(checkOut.diff(checkIn));
    attendance.workingHours = Number(diff.asHours().toFixed(2));

    await attendance.save();

    res.json({
      msg: "Check-out successful ✅",
      attendance,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ✅ MONTHLY
exports.getMonthly = async (req, res) => {
  try {
    const { month, year } = req.query;

    const days = new Date(year, month, 0).getDate();

    let result = [];

    for (let i = 1; i <= days; i++) {
      const date = `${year}-${month.padStart(2, "0")}-${String(i).padStart(2, "0")}`;

      const record = await Attendance.findOne({
        user: req.user.id,
        date,
      });

      if (record) {
        result.push(record);
      } else {
        result.push({
          date,
          status: "Absent",
        });
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
// ✅ ADMIN - DATE WISE ATTENDANCE
exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.query;

    const users = await User.find();

    let result = [];

    for (let user of users) {
      const record = await Attendance.findOne({
        user: user._id,
        date: date,
      }).populate("user", "name email");

      if (record) {
        result.push(record);
      } else {
        result.push({
          user: {
            name: user.name,
            email: user.email,
          },
          date: date,
          status: "Absent",
        });
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};
// ✅ ADMIN - EMPLOYEE MONTHLY ATTENDANCE
exports.getEmployeeAttendance = async (req, res) => {
  try {
    const { userId, month, year } = req.query;

    // 🔥 FIX (DB मधून role check)
    const user = await User.findById(req.user.id);

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ msg: "Access denied ❌" });
    }

    const daysInMonth = new Date(year, month, 0).getDate();

    let result = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const date = `${year}-${month.padStart(2, "0")}-${String(i).padStart(2, "0")}`;

      const record = await Attendance.findOne({
        user: userId,
        date,
      });

      if (record) {
        result.push(record);
      } else {
        result.push({
          date,
          status: "Absent",
        });
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
// ✅ GET TODAY ATTENDANCE (EMPLOYEE)
exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    }); // YYYY-MM-DD

    const record = await Attendance.findOne({
      user: req.user.id,
      date: today,
    });

    if (!record) {
      return res.json({
        status: "Absent",
      });
    }

    res.json(record);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
// ✅ ADMIN - ALL
exports.getAllAttendance = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied ❌" });
  }

  const data = await Attendance.find().populate("user", "name email");

  res.json(data);
};
