const cron = require("node-cron");
const moment = require("moment");
const Attendance = require("./models/Attendance");

cron.schedule("0 18 * * *", async () => {
  console.log("Running 6 PM checkout reminder...");

  const today = moment().format("YYYY-MM-DD");

  const records = await Attendance.find({ date: today });

  for (let record of records) {
    const lastSession = record.sessions[record.sessions.length - 1];

    if (lastSession && !lastSession.checkOut) {
      console.log(`Reminder → User: ${record.user}`);
    }
  }
});
