const { randomInt } = require("node:crypto");
const transporter = require("./nodemailer");
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

  const now = new Date();
  const cooldownBoundary = new Date(now.getTime() - 60 * 1000);
  const otp = String(randomInt(100000, 1000000));
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  let otpRecord;

  try {
    // Unique email+purpose index + conditional upsert makes issuance race-safe.
    // A recent record cannot be replaced, even by concurrent requests.
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
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: normalizedEmail,
      subject: "NewsHub verification code",
      text: `Your NewsHub verification code is ${otp}. It expires in 10 minutes. Do not share this code.`,
      html: `
            <div>
                <h2>NewsHub verification</h2>
                <p>Your verification code is:</p>
                <h1>${otp}</h1>
                <p>This code expires in 10 minutes.</p>
            </div>
        `,
    });

    console.log("OTP EMAIL DELIVERY RESULT:", {
      messageId: info.messageId,
      acceptedCount: info.accepted.length,
      rejectedCount: info.rejected.length,
      response: info.response,
    });
  } catch (error) {
    console.error("OTP EMAIL DELIVERY FAILED:", {
      code: error.code,
      command: error.command,
      response: error.response,
    });

    await OTPModel.deleteOne({
      _id: otpRecord._id,
    }).catch(() => {});

    throw error;
  }

  return true;
}

module.exports = generateSixDigitNumber;
