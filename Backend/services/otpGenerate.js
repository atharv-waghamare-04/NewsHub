const { randomInt } = require("node:crypto");
const sendEmail = require("./googleMail");
const OTPModel = require("../models/otp.model");
const { createOtpHash } = require("./otpHash");

async function generateSixDigitNumber(email, purpose) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (
    !normalizedEmail ||
    !["user_signup", "user_password_reset", "admin_password_reset"].includes(
      purpose,
    )
  ) {
    const error = new Error(
      "A valid email address and OTP purpose are required.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!process.env.MAIL_API_URL || !process.env.MAIL_SECRET) {
    throw new Error("Google Mail API configuration is missing.");
  }

  const now = new Date();
  const cooldownBoundary = new Date(now.getTime() - 60 * 1000);
  const otp = String(randomInt(100000, 1000000));
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  let otpRecord;

  try {
    otpRecord = await OTPModel.findOneAndUpdate(
      {
        email: normalizedEmail,
        purpose,
        $or: [
          { lastSentAt: { $lte: cooldownBoundary } },
          { lastSentAt: { $exists: false } },
        ],
      },
      {
        $set: {
          otpHash: createOtpHash(normalizedEmail, otp, purpose),
          expiresAt,
          lastSentAt: now,
          attempts: 0,
        },
        $setOnInsert: {
          email: normalizedEmail,
          purpose,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  } catch (error) {
    if (error.code === 11000) {
      const rateLimitError = new Error(
        "Please wait before requesting another OTP.",
      );
      rateLimitError.statusCode = 429;
      throw rateLimitError;
    }
    throw error;
  }

  try {
    const result = await sendEmail({
      to: normalizedEmail,
      subject: "NewsHub verification code",
      text: `Your NewsHub verification code is ${otp}. It expires in 10 minutes. Do not share this code.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #1f2937;">NewsHub Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="font-size: 36px; letter-spacing: 8px; color: #2563eb;">
            ${otp}
          </h1>
          <p style="color: #6b7280;">
            This code expires in 10 minutes.
          </p>
          <p style="color: #dc2626; font-size: 13px;">
            Do not share this code with anyone.
          </p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #9ca3af;">
            This is an automated email from NewsHub. Please do not reply.
          </p>
        </div>
      `,
    });

    console.log("OTP EMAIL SENT SUCCESSFULLY:", {
      recipient: normalizedEmail,
      purpose,
      success: result.success,
    });
  } catch (error) {
    console.error("OTP EMAIL DELIVERY FAILED:", error.message);

    await OTPModel.deleteOne({
      _id: otpRecord._id,
    }).catch((cleanupError) => {
      console.error("OTP CLEANUP FAILED:", cleanupError.message);
    });

    throw error;
  }

  return true;
}

module.exports = generateSixDigitNumber;
