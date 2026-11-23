const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: ["user_signup", "user_password_reset", "admin_password_reset"],
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    lastSentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  { timestamps: true }
);

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

const OTPModel = mongoose.model("nh_otp_details", otpSchema);
module.exports = OTPModel;
