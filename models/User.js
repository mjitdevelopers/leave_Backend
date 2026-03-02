const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },
    deviceId: {
      type: String,
    },
    role: {
      type: String,
      enum: ["ADMIN", "EMPLOYEE"],
      required: true,
    },
    profileImage: {
      type: String,
    },
    department: {
      type: String,
      enum: ["IT", "HR", "SALES", "ACCOUNTING", "GRAPHIC DESIGNING"],
      required: true,
    },

    otp: String,

    otpExpiry: Date,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
