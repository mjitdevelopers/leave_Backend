const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    filePath: { type: String, required: true },
    fileType: { type: String }, // pdf / image
  },
  { timestamps: true },
);

module.exports = mongoose.model("Document", documentSchema);
