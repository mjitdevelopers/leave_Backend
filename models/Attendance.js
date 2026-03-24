const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  checkIn: String, // HH:mm:ss
  checkOut: String, // HH:mm:ss
  workingHours: Number,
});

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  date: String, // YYYY-MM-DD (IST)

  status: String, // Present / Late / Absent

  // 🔥 NEW (Main change)
  sessions: [sessionSchema],

  totalWorkingHours: {
    type: Number,
    default: 0,
  },

  totalBreakHours: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
