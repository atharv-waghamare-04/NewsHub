const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");

const { isPasswordWithinBcryptLimit } = require("../services/authSecurity");

const {
  create_new_user,
  sendOTPtoEmail,
  login_admin,
  forget_password,
} = require("../controller/user.controller");

const router = express.Router();

// Preserve Gmail dots and all other valid email characters.
const emailRule = body("email")
  .isString()
  .withMessage("Email must be a string.")
  .bail()
  .trim()
  .isEmail()
  .withMessage("Invalid email.")
  .bail()
  .customSanitizer((value) => value.toLowerCase());

// OTP request rate limiter
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again later.",
  },
});

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again later.",
  },
});

// Registration rate limiter
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later.",
  },
});

// Password validation
const passwordRule = body("password")
  .isString()
  .bail()
  .custom(isPasswordWithinBcryptLimit)
  .withMessage("Password must be 12–72 bytes long.");

// User registration
router.post(
  "/create-new-user",
  registrationLimiter,
  body("name").isString().trim().isLength({ min: 2, max: 60 }),
  body("mobile_no")
    .isMobilePhone("en-IN")
    .withMessage("Invalid mobile number."),
  emailRule,
  passwordRule,
  body("confirm_password")
    .isString()
    .withMessage("Confirm password is required."),
  body("otp")
    .isNumeric()
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must contain six digits."),
  create_new_user,
);

// Generate signup/password-reset OTP
router.post(
  "/generate-otp-for-admin",
  otpRequestLimiter,
  emailRule,
  body("purpose")
    .isIn(["user_signup", "user_password_reset"])
    .withMessage("Invalid OTP purpose."),
  sendOTPtoEmail,
);

// User login
router.post(
  "/login-admin",
  loginLimiter,
  emailRule,
  body("password").isString().notEmpty().withMessage("Password is required."),
  login_admin,
);

// User password reset
router.post(
  "/forget-password",
  passwordResetLimiter,
  emailRule,
  passwordRule,
  body("confirm_password")
    .isString()
    .withMessage("Confirm password is required."),
  body("otp")
    .isNumeric()
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must contain six digits."),
  forget_password,
);

module.exports = router;
