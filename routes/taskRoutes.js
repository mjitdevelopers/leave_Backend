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
router.get("/history", verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({ employee: req.user.id }).sort({
      updatedAt: -1,
    });

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
