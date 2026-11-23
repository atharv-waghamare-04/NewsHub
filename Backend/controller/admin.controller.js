const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const AdminModel = require("../models/admin.model");
const generateSixDigitNumber = require("../services/otpGenerate");
const { consumeOtp } = require("../services/otpSecurity");
const {
  getValidationErrors,
  normalizeEmail,
  otpFailureResponse,
} = require("../services/authUtils");

const PASSWORD_ROUNDS = 12;

const create_new_user = async (req, res) => {
  // Admin accounts must be provisioned through the trusted backend CLI script.
  // Never expose administrator creation as a public browser endpoint.
  return res.status(403).json({
    message: "Public administrator registration is disabled.",
    success: false,
  });
};

const sendOTPtoEmail = async (req, res) => {
  try {
    const errors = getValidationErrors(req);
    if (errors) {
      return res.status(400).json({
        message: "Validation Errors",
        errors,
        success: false,
      });
    }

    const email = normalizeEmail(req.body.email);
    const admin = await AdminModel.findOne({ email }).select("_id");

    // Avoid disclosing whether an administrator email exists.
    if (admin) {
      await generateSixDigitNumber(email, "admin_password_reset");
    }

    return res.status(200).json({
      message:
        "If the administrator account exists, a recovery code has been sent.",
      success: true,
    });
  } catch (error) {
    console.error("Admin OTP request failed:", error.message);
    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode === 429
          ? error.message
          : "Unable to process OTP request.",
      success: false,
    });
  }
};

const login_admin = async (req, res) => {
  try {
    const errors = getValidationErrors(req);
    if (errors) {
      return res.status(400).json({
        message: "Validation Errors",
        errors,
        success: false,
      });
    }

    const email = normalizeEmail(req.body.email);
    const admin = await AdminModel.findOne({ email }).select(
      "+password +tokenVersion",
    );

    if (!admin) {
      return res.status(401).json({
        message: "Invalid email or password.",
        success: false,
      });
    }

    const submittedPassword = String(req.body.password);
    if (Buffer.byteLength(submittedPassword, "utf8") > 72) {
      return res.status(401).json({
        message: "Invalid email or password.",
        success: false,
      });
    }

    const passwordMatches = await bcrypt.compare(
      submittedPassword,
      admin.password,
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
        success: false,
      });
    }

    admin.login_history.push(new Date());
    if (admin.login_history.length > 50)
      admin.login_history = admin.login_history.slice(-50);
    await admin.save();

    if (
      !process.env.JWT_SECRET ||
      Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32
    ) {
      throw new Error(
        "JWT_SECRET must be configured with at least 32 characters.",
      );
    }

    const token = jwt.sign(
      {
        _id: admin._id,
        email: admin.email,
        mobile_no: admin.mobile_no,
        role: "admin",
        ver: Number(admin.tokenVersion || 0),
      },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
        issuer: "newshub-api",
        audience: "newshub-client",
      },
    );

    return res.status(200).json({
      message: "Login Successfully",
      success: true,
      token,
    });
  } catch (error) {
    console.error("Admin login failed:", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

const forget_password = async (req, res) => {
  try {
    const errors = getValidationErrors(req);
    if (errors) {
      return res.status(400).json({
        message: "Validation Errors",
        errors,
        success: false,
      });
    }

    const email = normalizeEmail(req.body.email);

    if (req.body.password !== req.body.confirm_password) {
      return res.status(400).json({
        message: "Passwords do not match.",
        success: false,
      });
    }

    const otpResult = await consumeOtp(
      email,
      req.body.otp,
      "admin_password_reset",
    );
    if (!otpResult.valid) {
      return otpFailureResponse(res, otpResult.reason);
    }

    const admin = await AdminModel.findOne({ email }).select(
      "+password +tokenVersion",
    );
    if (!admin) {
      return res.status(400).json({
        message: "Invalid recovery details.",
        success: false,
      });
    }

    admin.password = await bcrypt.hash(
      String(req.body.password),
      PASSWORD_ROUNDS,
    );
    admin.tokenVersion = Number(admin.tokenVersion || 0) + 1;
    await admin.save();

    return res.status(200).json({
      message: "Password has changed.",
      success: true,
    });
  } catch (error) {
    console.error("Admin password reset failed:", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

module.exports = {
  create_new_user,
  sendOTPtoEmail,
  login_admin,
  forget_password,
};
