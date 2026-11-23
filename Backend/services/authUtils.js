const { validationResult } = require("express-validator");

function getValidationErrors(req) {
  const result = validationResult(req);
  return result.isEmpty() ? null : result.array();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function otpFailureResponse(res, reason) {
  const messages = {
    OTP_NOT_FOUND: "Invalid or expired OTP.",
    OTP_EXPIRED: "OTP has expired. Request a new code.",
    OTP_ATTEMPTS_EXCEEDED: "Too many incorrect attempts. Request a new code.",
    OTP_INVALID: "Invalid OTP.",
  };

  return res.status(400).json({
    message: messages[reason] || "OTP verification failed.",
    success: false,
  });
}

module.exports = { getValidationErrors, normalizeEmail, otpFailureResponse };
