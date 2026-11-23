const crypto = require("node:crypto");

const ALLOWED_PURPOSES = new Set([
  "user_signup",
  "user_password_reset",
  "admin_password_reset",
]);

function getOtpSecret() {
  const secret = process.env.OTP_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("OTP_SECRET must be configured with at least 32 bytes.");
  }

  return secret;
}

function createOtpHash(email, otp, purpose) {
  if (!ALLOWED_PURPOSES.has(purpose)) {
    throw new Error("Invalid OTP purpose.");
  }

  return crypto
    .createHmac("sha256", getOtpSecret())
    .update(
      `${purpose}:${String(email).trim().toLowerCase()}:${String(otp)}`
    )
    .digest("hex");
}

module.exports = { createOtpHash, getOtpSecret, ALLOWED_PURPOSES };
