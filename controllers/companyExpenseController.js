const CompanyExpense = require("../models/CompanyExpense");

// Add Expense
exports.addExpense = async (req, res) => {
  try {
    const count = await CompanyExpense.countDocuments();
    const billNumber = "MJT-EXP-" + (count + 1);

    const expense = new CompanyExpense({
      ...req.body,
      billNumber,
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Expenses
exports.getAllExpenses = async (req, res) => {
  try {
    const expenses = await CompanyExpense.find().sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Expense
exports.deleteExpense = async (req, res) => {
  try {
    await CompanyExpense.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
