const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const transporter = require("../config/mail");

// ================= TOKEN =================
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      department,
    });

    res.status(201).json({
      message: "Registered Successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Please Signup First",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({
        message: "Wrong Password",
      });
    }

    res.json({
      token: generateToken(user._id),
      role: user.role,
      name: user.name,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ================= SEND OTP =================
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
    });

    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;

    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "HRMS Password Reset OTP",
      text: `Your OTP is ${otp}`,
    });

    res.json({
      message: "OTP Sent to Email",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const isAdmin = async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ message: "Access denied" });
  }

  next();
};

module.exports.verifyToken = verifyToken;
module.exports.isAdmin = isAdmin;
