const Salary = require("../models/Salary");
const Attendance = require("../models/Attendance");

// ================================
// GENERATE SALARY
// ================================
exports.generateSalary = async (req, res) => {
  try {
    const { employeeId, month, basicSalary } = req.body;

    if (!employeeId || !month || !basicSalary) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const [year, monthNumber] = month.split("-").map(Number);

    const totalDaysInMonth = new Date(year, monthNumber, 0).getDate();

    const startDate = new Date(year, monthNumber - 1, 1)
      .toISOString()
      .split("T")[0];

    const endDate = new Date(year, monthNumber - 1, totalDaysInMonth)
      .toISOString()
      .split("T")[0];

    // 🔹 Fetch Attendance Records
    const attendanceRecords = await Attendance.find({
      user: employeeId,
      date: { $gte: startDate, $lte: endDate },
    });

    // 🔹 Convert to map
    const attendanceMap = {};
    attendanceRecords.forEach((record) => {
      attendanceMap[record.date] = record.status;
    });

    let workingDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let lateCount = 0;

    for (
      let d = new Date(year, monthNumber - 1, 1);
      d.getMonth() === monthNumber - 1;
      d.setDate(d.getDate() + 1)
    ) {
      const day = d.getDay(); // 0 = Sunday
      const formatted = d.toISOString().split("T")[0];

      if (day === 0) continue; // Ignore Sunday

      workingDays++;

      const status = attendanceMap[formatted];

      if (!status) {
        absentDays++; // Auto Absent
      } else if (status === "Present") {
        presentDays++;
      } else if (status === "Absent") {
        absentDays++;
      } else if (status === "Late") {
        lateCount++;
        presentDays++;
      }
    }

    // 🔹 Salary Calculation
    const perDaySalary = basicSalary / totalDaysInMonth;
    const perHourSalary = perDaySalary / 8;

    let lateDeduction = 0;

    if (lateCount <= 2) {
      lateDeduction = perHourSalary * lateCount;
    } else if (lateCount === 3) {
      lateDeduction = perDaySalary / 2;
    } else {
      lateDeduction = perDaySalary;
    }

    const absentDeduction = perDaySalary * absentDays;

    const netSalary = basicSalary - lateDeduction - absentDeduction;

    // 🔹 Save or Update Salary
    const salary = await Salary.findOneAndUpdate(
      { employeeId, month },
      {
        employeeId,
        month,
        basicSalary,
        totalDaysInMonth,
        workingDays,
        presentDays,
        absentDays,
        lateCount,
        lateDeduction: Number(lateDeduction.toFixed(2)),
        absentDeduction: Number(absentDeduction.toFixed(2)),
        netSalary: Number(netSalary.toFixed(2)),
        status: "PENDING",
      },
      { upsert: true, new: true },
    );

    res.json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================================
// GET EMPLOYEE SALARY
// ================================
exports.getEmployeeSalary = async (req, res) => {
  try {
    const salaries = await Salary.find({
      employeeId: req.params.employeeId,
    }).sort({ createdAt: -1 });

    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================================
// MARK SALARY AS PAID
// ================================
exports.markSalaryPaid = async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.salaryId);

    if (!salary) {
      return res.status(404).json({ message: "Salary not found" });
    }

    if (salary.status === "PAID") {
      return res.status(400).json({ message: "Already Paid" });
    }

    salary.status = "PAID";
    salary.paidDate = new Date();

    await salary.save();

    res.json({ message: "Salary marked as PAID", salary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.markSalaryPaid = async (req, res) => {
  try {
    const { paymentMode } = req.body;

    const salary = await Salary.findById(req.params.salaryId);

    if (!salary) {
      return res.status(404).json({ message: "Salary not found" });
    }

    if (salary.status === "PAID") {
      return res.status(400).json({ message: "Already Paid" });
    }

    salary.status = "PAID";
    salary.paidDate = new Date();
    salary.paymentMode = paymentMode;

    await salary.save();

    res.json({ message: "Salary marked as PAID", salary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
