const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const controller = require("../controllers/attendanceController");

router.post("/check-in", verifyToken, controller.checkIn);
router.post("/check-out", verifyToken, controller.checkOut);

router.get("/monthly", verifyToken, controller.getMonthly);

// admin
router.get("/admin/all", verifyToken, controller.getAllAttendance);
router.get("/admin/date", verifyToken, controller.getAttendanceByDate);
router.get("/admin/employee", verifyToken, controller.getEmployeeAttendance);
router.get("/today", verifyToken, controller.getTodayAttendance);
module.exports = router;
