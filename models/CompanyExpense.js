const mongoose = require("mongoose");

const companyExpenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  description: String,
  billNumber: String,
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("CompanyExpense", companyExpenseSchema);
