const express = require("express");
const router = express.Router();

const {
  generateSalary,
  getEmployeeSalary,
  markSalaryPaid,
} = require("../controllers/salaryController");

// Generate Salary
router.post("/generate", generateSalary);

// Get Employee Salary
router.get("/employee/:employeeId", getEmployeeSalary);

// Mark Salary as Paid
router.patch("/mark-paid/:salaryId", markSalaryPaid);

module.exports = router;
