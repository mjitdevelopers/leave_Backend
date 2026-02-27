const Task = require("../models/Task");
const User = require("../models/User");

// ================= CREATE TASK =================
const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate } = req.body;

    const task = await Task.create({
      title,
      description,
      assignedTo,
      assignedBy: req.user.id,
      priority,
      dueDate,
    });

    res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= AUTO OVERDUE CHECK FUNCTION =================
const checkOverdueTasks = async (tasks) => {
  const now = new Date();

  for (let task of tasks) {
    if (
      task.status !== "Completed" &&
      task.dueDate &&
      new Date(task.dueDate) < now
    ) {
      task.status = "Overdue";
      await task.save();
    }
  }
};

// ================= GET MY TASKS =================
const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id }).sort({
      createdAt: -1,
    });

    await checkOverdueTasks(tasks);

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= UPDATE TASK STATUS =================
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (
      task.assignedTo.toString() !== req.user.id &&
      req.user.role !== "ADMIN"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.status = status;

    // ✅ If completed → save completion time
    if (status === "Completed") {
      task.completedAt = new Date();
    }

    await task.save();

    res.json({
      message: "Task status updated successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= GET ALL TASKS (ADMIN) =================
const getAllTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const skip = (page - 1) * limit;

    const total = await Task.countDocuments();

    const tasks = await Task.find()
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    await checkOverdueTasks(tasks);

    res.json({
      totalTasks: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      tasks,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= DELETE TASK (ADMIN) =================
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    await task.deleteOne();

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= TASK ANALYTICS =================
const getTaskAnalytics = async (req, res) => {
  try {
    const total = await Task.countDocuments();
    const pending = await Task.countDocuments({ status: "Pending" });
    const inProgress = await Task.countDocuments({ status: "In Progress" });
    const completed = await Task.countDocuments({ status: "Completed" });
    const overdue = await Task.countDocuments({ status: "Overdue" });

    res.json({
      total,
      pending,
      inProgress,
      completed,
      overdue,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= GET TASKS BY EMPLOYEE (ADMIN) =================
const getTasksByEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;

    const tasks = await Task.find({ assignedTo: employeeId })
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 });

    await checkOverdueTasks(tasks);

    res.json({
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// ================= EMPLOYEE TASK SUMMARY (ADMIN) =================
const getEmployeeTaskSummary = async (req, res) => {
  try {
    const summary = await Task.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "assignedTo",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $match: {
          "employee.role": { $ne: "ADMIN" },
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          employeeName: { $first: "$employee.name" },
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "Pending"] }, 1, 0],
            },
          },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$status", "Completed"] }, 1, 0],
            },
          },
        },
      },
    ]);

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTask,
  getMyTasks,
  updateTaskStatus,
  getAllTasks,
  deleteTask,
  getTaskAnalytics,
  getTasksByEmployee,
  getEmployeeTaskSummary,
};
