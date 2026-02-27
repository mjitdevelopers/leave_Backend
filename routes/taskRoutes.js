const express = require("express");
const router = express.Router();

const {
  createTask,
  getMyTasks,
  updateTaskStatus,
  getAllTasks,
  deleteTask,
  getTaskAnalytics,
  getTasksByEmployee,
  getEmployeeTaskSummary,
} = require("../controllers/taskController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

router.post("/create", verifyToken, isAdmin, createTask);
router.get("/my", verifyToken, getMyTasks);
router.put("/update-status/:id", verifyToken, updateTaskStatus);
router.get("/all", verifyToken, isAdmin, getAllTasks);
router.delete("/delete/:id", verifyToken, isAdmin, deleteTask);
router.get("/analytics", verifyToken, isAdmin, getTaskAnalytics);
router.get("/employee/:id", verifyToken, isAdmin, getTasksByEmployee);
router.get("/employee-summary", verifyToken, isAdmin, getEmployeeTaskSummary);
module.exports = router;
