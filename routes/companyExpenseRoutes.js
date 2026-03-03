const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/companyExpenseController");

router.post("/add", expenseController.addExpense);
router.get("/all", expenseController.getAllExpenses);
router.delete("/:id", expenseController.deleteExpense);
router.put("/:id", expenseController.updateExpense);

module.exports = router;
