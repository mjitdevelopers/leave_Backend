const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  date: String, // YYYY-MM-DD (IST)

  checkIn: String, // HH:mm:ss
  checkOut: String, // HH:mm:ss

  status: String, // Present / Late / Absent

  workingHours: Number,
});

module.exports = mongoose.model("Attendance", attendanceSchema);
