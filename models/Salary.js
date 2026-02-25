const mongoose = require("mongoose");

const salarySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentMode: {
      type: String,
      enum: ["CASH", "ONLINE"],
    },
    month: {
      type: String,
      required: true,
    },
    basicSalary: {
      type: Number,
      required: true,
    },
    totalDaysInMonth: Number,
    workingDays: Number,
    presentDays: Number,
    absentDays: Number,
    lateCount: Number,
    lateDeduction: Number,
    absentDeduction: Number,
    netSalary: Number,
    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },
    paidDate: Date,
  },
  { timestamps: true },
);

salarySchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Salary", salarySchema);
