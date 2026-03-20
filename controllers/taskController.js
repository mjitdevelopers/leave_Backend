const Task = require("../models/Task");
const User = require("../models/User");

// ================= COMMON STATUS =================
const VALID_STATUS = ["Pending", "In Progress", "Completed", "Overdue"];

// ================= CREATE TASK =================
const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate } = req.body;

    if (!title || !assignedTo) {
      return res.status(400).json({
        message: "Title and assignedTo are required",
      });
    }

    // Check user exists
    const user = await User.findById(assignedTo);
    if (!user) {
      return res.status(404).json({ message: "Assigned user not found" });
    }

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

// ================= AUTO OVERDUE UPDATE =================
const updateOverdueTasks = async () => {
  const now = new Date();

  await Task.updateMany(
    {
      status: { $ne: "Completed" },
      dueDate: { $lt: now },
    },
    { $set: { status: "Overdue" } },
  );
};

// ================= GET MY TASKS =================
const getMyTasks = async (req, res) => {
  try {
    await updateOverdueTasks();

    const tasks = await Task.find({ assignedTo: req.user.id }).sort({
      createdAt: -1,
    });

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

    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Authorization
    if (
      task.assignedTo.toString() !== req.user.id &&
      req.user.role !== "ADMIN"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.status = status;

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
    await updateOverdueTasks();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const skip = (page - 1) * limit;

    const { status, priority } = req.query;

    let filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const total = await Task.countDocuments(filter);

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Not authorized" });
    }

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
    const stats = await Task.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    let result = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
    };

    stats.forEach((item) => {
      result.total += item.count;

      if (item._id === "Pending") result.pending = item.count;
      if (item._id === "In Progress") result.inProgress = item.count;
      if (item._id === "Completed") result.completed = item.count;
      if (item._id === "Overdue") result.overdue = item.count;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= GET TASKS BY EMPLOYEE =================
const getTasksByEmployee = async (req, res) => {
  try {
    await updateOverdueTasks();

    const employeeId = req.params.id;

    if (!employeeId) {
      return res.status(400).json({ message: "Employee ID required" });
    }

    const tasks = await Task.find({ assignedTo: employeeId })
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 });

    res.json({
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= EMPLOYEE TASK SUMMARY =================
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
