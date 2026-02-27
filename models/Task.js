const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Overdue"], // ✅ Added Overdue
      default: "Pending",
    },

    dueDate: {
      type: Date,
      required: true,
    },

    completedAt: {
      type: Date, // ✅ when employee completes task
    },

    estimatedHours: {
      type: Number,
      default: 0,
    },

    actualMinutes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }, // createdAt & updatedAt auto
);

module.exports = mongoose.model("Task", taskSchema);
