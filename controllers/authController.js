const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const transporter = require("../config/mail");

// ================= TOKEN =================
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password || !role || !department) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashed,
      role,
      department,
    });

    res.status(201).json({ message: "Registered Successfully" });
  } catch (error) {
    res.status(500).json({ message: "Registration Failed" });
  }
};

// ================= LOGIN =================
// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    console.log("========== LOGIN API CALLED ==========");
    console.log("REQUEST BODY:", req.body);

    const { email, password } = req.body;

    // 🔴 Validate input
    if (!email || !password) {
      console.log("❌ Email or Password missing");

      return res.status(400).json({
        message: "Email and Password required",
      });
    }

    // 🔎 Find user
    const user = await User.findOne({ email });

    console.log("USER FOUND:", user);

    if (!user) {
      console.log("❌ USER NOT FOUND");

      return res.status(400).json({
        message: "User not found",
      });
    }

    // 🔴 Check password exists
    if (!user.password) {
      console.log("❌ PASSWORD FIELD MISSING IN DB");

      return res.status(500).json({
        message: "User password missing in database",
      });
    }

    // 🔐 Compare password
    console.log("ENTERED PASSWORD:", password);
    console.log("HASHED PASSWORD:", user.password);

    const match = await bcrypt.compare(password, user.password);

    console.log("PASSWORD MATCH RESULT:", match);

    if (!match) {
      console.log("❌ PASSWORD NOT MATCHED");

      return res.status(400).json({
        message: "Wrong Password",
      });
    }

    // ✅ Success response
    console.log("✅ LOGIN SUCCESS");

    res.json({
      token: generateToken(user._id),
      role: user.role,
      name: user.name,
    });
  } catch (error) {
    console.log("🔥 LOGIN ERROR OCCURRED");
    console.log(error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// ================= SEND OTP =================
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
    });

    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await transporter.sendMail({
      from: `"MJIT Solutions" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset OTP - MJIT Solutions",
      html: `
        <div style="font-family: Arial; text-align:center;">
          <h2>MJIT Solutions</h2>
          <p>Your OTP for password reset is:</p>
          <h1 style="color:#1565C0;">${otp}</h1>
          <p>This OTP is valid for 10 minutes.</p>
        </div>
      `,
    });

    res.json({ message: "OTP sent to email successfully" });
  } catch (error) {
    console.log("MAIL ERROR:", error);
    res.status(500).json({ message: "Email sending failed" });
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // 🔥 FIXED COMPARISON
    if (user.otp?.toString() !== otp.toString()) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP Expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    res.json({ message: "Password Reset Successful" });
  } catch (error) {
    res.status(500).json({ message: "Password Reset Failed" });
  }
};
