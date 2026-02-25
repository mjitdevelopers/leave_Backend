const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    date: {
      type: String,
    },

    checkIn: {
      type: String,
    },

    checkOut: {
      type: String,
    },

    status: {
      type: String,
      enum: ["Present", "Late", "WFH"],
    },
    locationName: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Attendance", attendanceSchema);
