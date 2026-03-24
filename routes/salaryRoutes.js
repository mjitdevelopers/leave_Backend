const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

const {
  generateSalary,
  getEmployeeSalary,
  markSalaryPaid,
  getPayslip,
  getMySalary,
  markSalarySeen,
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
// ================================
// 👤 EMPLOYEE - MY SALARY
// ================================
router.get("/my", verifyToken, getMySalary);

// ================================
// 🔔 MARK AS SEEN
// ================================
router.put("/seen/:salaryId", verifyToken, markSalarySeen);

module.exports = router;
