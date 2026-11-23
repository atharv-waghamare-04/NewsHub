const crypto = require("node:crypto");
const OTPModel = require("../models/otp.model");
const { createOtpHash, ALLOWED_PURPOSES } = require("./otpHash");

async function consumeOtp(email, otp, purpose) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!/^\d{6}$/.test(String(otp || "")) || !ALLOWED_PURPOSES.has(purpose)) {
    return { valid: false, reason: "OTP_INVALID" };
  }

  const now = new Date();
  const record = await OTPModel.findOne({
    email: normalizedEmail,
    purpose,
    expiresAt: { $gt: now },
    attempts: { $lt: 5 },
  })
    .select("+otpHash")
    .lean();

  if (!record) {
    const expiredOrMissing = await OTPModel.exists({
      email: normalizedEmail,
      purpose,
    });
    return {
      valid: false,
      reason: expiredOrMissing ? "OTP_EXPIRED" : "OTP_NOT_FOUND",
    };
  }

  const submittedHash = Buffer.from(
    createOtpHash(normalizedEmail, otp, purpose),
    "hex",
  );
  const storedHash = Buffer.from(record.otpHash, "hex");

  const matches =
    submittedHash.length === storedHash.length &&
    crypto.timingSafeEqual(submittedHash, storedHash);

  if (!matches) {
    const updated = await OTPModel.findOneAndUpdate(
      {
        _id: record._id,
        email: normalizedEmail,
        purpose,
        expiresAt: { $gt: now },
        attempts: { $lt: 5 },
      },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" },
    ).select("attempts");

    if (!updated) {
      return { valid: false, reason: "OTP_NOT_FOUND" };
    }

    if (updated.attempts >= 5) {
      await OTPModel.deleteOne({ _id: updated._id });
      return { valid: false, reason: "OTP_ATTEMPTS_EXCEEDED" };
    }

    return { valid: false, reason: "OTP_INVALID" };
  }

  // Atomic one-time claim: only one concurrent consumer can delete this record.
  const consumed = await OTPModel.findOneAndDelete({
    _id: record._id,
    email: normalizedEmail,
    purpose,
    otpHash: record.otpHash,
    expiresAt: { $gt: now },
    attempts: { $lt: 5 },
  });

  if (!consumed) {
    return { valid: false, reason: "OTP_NOT_FOUND" };
  }

  return { valid: true };
}

module.exports = { createOtpHash, consumeOtp };
