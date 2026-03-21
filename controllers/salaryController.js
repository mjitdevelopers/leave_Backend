const Salary = require("../models/Salary");
const Attendance = require("../models/Attendance");

// ================================
// 💰 GENERATE SALARY
// ================================
exports.generateSalary = async (req, res) => {
  try {
    const {
      employeeId,
      month,
      basicSalary,

      hra = 0,
      conveyance = 0,
      specialAllowance = 0,

      providentFund = 0,
      esi = 0,
      loan = 0,
      professionTax = 0,
      tds = 0,
    } = req.body;

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

    // 🔹 Attendance Fetch
    const attendanceRecords = await Attendance.find({
      user: employeeId,
      date: { $gte: startDate, $lte: endDate },
    });

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
      const day = d.getDay();
      const formatted = d.toISOString().split("T")[0];

      if (day === 0) continue;

      workingDays++;

      const status = attendanceMap[formatted];

      if (!status) {
        absentDays++;
      } else if (status === "Present" || status === "WFH") {
        presentDays++;
      } else if (status === "Absent") {
        absentDays++;
      } else if (status === "Late") {
        lateCount++;
        presentDays++;
      }
    }

    // ================================
    // 🧮 SALARY CALCULATION
    // ================================
    const perDaySalary = basicSalary / totalDaysInMonth;

    // ✅ earned salary
    const earnedBasic = perDaySalary * presentDays;

    // 👉 attendance = 0 case
    if (presentDays === 0) {
      const salary = await Salary.findOneAndUpdate(
        { employeeId, month },
        {
          employeeId,
          month,
          periodFrom: startDate,
          periodTo: endDate,

          basicSalary: 0,
          hra: 0,
          conveyance: 0,
          specialAllowance: 0,
          totalEarnings: 0,

          totalDaysInMonth,
          workingDays,
          presentDays,
          absentDays,
          lateCount,

          providentFund: 0,
          esi: 0,
          loan: 0,
          professionTax: 0,
          tds: 0,

          lateDeduction: 0,
          absentDeduction: 0,
          totalDeduction: 0,

          netSalary: 0,
          status: "PENDING",
        },
        { upsert: true, new: true },
      );

      return res.json(salary);
    }

    // ================================
    // 🟢 EARNINGS
    // ================================
    const totalEarnings =
      Number(earnedBasic) +
      Number(hra) +
      Number(conveyance) +
      Number(specialAllowance);

    // ================================
    // 🔴 DEDUCTIONS
    // ================================
    const perHourSalary = perDaySalary / 8;

    let lateDeduction = 0;

    if (lateCount <= 2) {
      lateDeduction = perHourSalary * lateCount;
    } else if (lateCount === 3) {
      lateDeduction = perDaySalary / 2;
    } else {
      lateDeduction = perDaySalary;
    }

    const totalDeduction =
      Number(providentFund) +
      Number(esi) +
      Number(loan) +
      Number(professionTax) +
      Number(tds) +
      lateDeduction;

    // ================================
    // 💰 NET SALARY
    // ================================
    const netSalary = totalEarnings - totalDeduction;

    // ================================
    // SAVE
    // ================================
    const salary = await Salary.findOneAndUpdate(
      { employeeId, month },
      {
        employeeId,
        month,
        periodFrom: startDate,
        periodTo: endDate,

        basicSalary: Number(earnedBasic.toFixed(2)),
        hra,
        conveyance,
        specialAllowance,
        totalEarnings: Number(totalEarnings.toFixed(2)),

        totalDaysInMonth,
        workingDays,
        presentDays,
        absentDays,
        lateCount,

        providentFund,
        esi,
        loan,
        professionTax,
        tds,

        lateDeduction: Number(lateDeduction.toFixed(2)),
        absentDeduction: 0,
        totalDeduction: Number(totalDeduction.toFixed(2)),

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
// 📄 GET EMPLOYEE SALARY
// ================================
exports.getEmployeeSalary = async (req, res) => {
  try {
    const salaries = await Salary.find({
      employeeId: req.params.employeeId,
    })
      .populate("employeeId", "name designation email")
      .sort({ createdAt: -1 });

    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================================
// ✅ MARK SALARY AS PAID
// ================================
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

// ================================
// 🧾 GET SINGLE PAYSLIP
// ================================
exports.getPayslip = async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.salaryId).populate(
      "employeeId",
      "name designation email",
    );

    if (!salary) {
      return res.status(404).json({ message: "Salary not found" });
    }

    res.json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
