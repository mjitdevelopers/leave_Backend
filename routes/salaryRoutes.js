const express = require("express");
const router = express.Router();

const {
  generateSalary,
  getEmployeeSalary,
  markSalaryPaid,
  getPayslip,
} = require("../controllers/salaryController");

// ================================
// 💰 GENERATE SALARY (ADMIN)
// ================================
router.post("/generate", generateSalary);

// ================================
// 📄 GET ALL SALARIES OF EMPLOYEE
// ================================
router.get("/employee/:employeeId", getEmployeeSalary);

// ================================
// 🧾 GET SINGLE PAYSLIP
// ================================
router.get("/payslip/:salaryId", getPayslip);

// ================================
// ✅ MARK SALARY AS PAID
// ================================
router.patch("/mark-paid/:salaryId", markSalaryPaid);

module.exports = router;
