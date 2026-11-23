const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { isPasswordWithinBcryptLimit } = require("../services/authSecurity");
const {
  create_new_user,
  sendOTPtoEmail,
  login_admin,
  forget_password,
} = require("../controller/admin.controller");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again later." },
});

const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many OTP requests. Please try again later." },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many password reset attempts. Please try again later." },
});

const passwordRule = body("password")
  .isString()
  .bail()
  .custom(isPasswordWithinBcryptLimit)
  .withMessage("Password must be 12–72 bytes long.");

router.post("/create-new-admin", create_new_user);

router.post(
  "/generate-otp-for-admin",
  otpRequestLimiter,
  body("email").isEmail().normalizeEmail().withMessage("Invalid email."),
  sendOTPtoEmail
);

router.post(
  "/login-admin",
  loginLimiter,
  body("email").isEmail().withMessage("Invalid email."),
  body("password").isString().notEmpty().withMessage("Password is required."),
  login_admin
);

router.post(
  "/forget-password",
  passwordResetLimiter,
  body("email").isEmail().normalizeEmail().withMessage("Invalid email."),
  passwordRule,
  body("confirm_password").isString().withMessage("Confirm password is required."),
  body("otp").isNumeric().isLength({ min: 6, max: 6 }).withMessage("OTP must contain six digits."),
  forget_password
);

module.exports = router;
