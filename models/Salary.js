const mongoose = require("mongoose");

const salarySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==========================
    // BASIC INFO
    // ==========================
    month: {
      type: String,
      required: true,
    },

    paymentMode: {
      type: String,
      enum: ["CASH", "ONLINE"],
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },

    paidDate: Date,

    // ==========================
    // 🟢 EARNINGS (Admin Entered)
    // ==========================
    basicSalary: {
      type: Number,
      required: true,
    },

    hra: {
      type: Number,
      default: 0,
    },

    conveyance: {
      type: Number,
      default: 0,
    },

    specialAllowance: {
      type: Number,
      default: 0,
    },

    totalEarnings: {
      type: Number,
      default: 0,
    },
    totalWorkingHours: {
      type: Number,
      default: 0,
    },
    perHourSalary: {
      type: Number,
      default: 0,
    },
    // ==========================
    // 📅 ATTENDANCE DETAILS
    // ==========================
    totalDaysInMonth: Number,
    workingDays: Number,
    presentDays: Number,
    absentDays: Number,
    lateCount: Number,

    // ==========================
    // 🔴 DEDUCTIONS
    // ==========================
    providentFund: {
      type: Number,
      default: 0,
    },
    periodFrom: {
      type: String,
    },

    periodTo: {
      type: String,
    },
    esi: {
      type: Number,
      default: 0,
    },

    loan: {
      type: Number,
      default: 0,
    },

    professionTax: {
      type: Number,
      default: 0,
    },

    tds: {
      type: Number,
      default: 0,
    },

    lateDeduction: {
      type: Number,
      default: 0,
    },

    absentDeduction: {
      type: Number,
      default: 0,
    },

    totalDeduction: {
      type: Number,
      default: 0,
    },

    // ==========================
    // 💰 FINAL
    // ==========================
    netSalary: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Unique index (one salary per month per employee)
salarySchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Salary", salarySchema);
