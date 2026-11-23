const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const UserModel = require("../models/user.model");
const generateSixDigitNumber = require("../services/otpGenerate");
const { consumeOtp } = require("../services/otpSecurity");
const {
  getValidationErrors,
  normalizeEmail,
  otpFailureResponse,
} = require("../services/authUtils");

const PASSWORD_ROUNDS = 12;

function signUserToken(user) {
  if (
    !process.env.JWT_SECRET ||
    Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32
  ) {
    throw new Error(
      "JWT_SECRET must be configured with at least 32 characters.",
    );
  }

  return jwt.sign(
    {
      _id: user._id,
      email: user.email,
      mobile_no: user.mobile_no,
      role: "user",
      ver: Number(user.tokenVersion || 0),
    },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      issuer: "newshub-api",
      audience: "newshub-client",
    },
  );
}

const create_new_user = async (req, res) => {
  try {
    const errors = getValidationErrors(req);

    if (errors) {
      return res.status(400).json({
        message: "Validation Errors",
        errors,
        success: false,
      });
    }

    const name = String(req.body.name).trim();
    const email = normalizeEmail(req.body.email);
    const mobile_no = String(req.body.mobile_no).trim();
    const password = String(req.body.password);

    if (password !== req.body.confirm_password) {
      return res.status(400).json({
        message: "Passwords do not match.",
        success: false,
      });
    }

    // CHECK 1: Existing email
    const existingEmail = await UserModel.exists({ email });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_REGISTERED",
        message: "An account with this email already exists. Please sign in.",
      });
    }

    // CHECK 2: Existing mobile number
    const existingMobile = await UserModel.exists({ mobile_no });

    if (existingMobile) {
      return res.status(409).json({
        success: false,
        code: "MOBILE_ALREADY_REGISTERED",
        message: "This mobile number is already registered.",
      });
    }

    // CHECK 3: Verify OTP only after duplicate checks
    const otpResult = await consumeOtp(email, req.body.otp, "user_signup");

    if (!otpResult.valid) {
      return otpFailureResponse(res, otpResult.reason);
    }

    // CHECK 4: Hash password
    const hashedPassword = await bcrypt.hash(password, PASSWORD_ROUNDS);

    // CHECK 5: Create account
    await UserModel.create({
      name,
      email,
      mobile_no,
      password: hashedPassword,
      login_history: [],
    });

    return res.status(201).json({
      message: "Your account has been created successfully.",
      success: true,
    });
  } catch (error) {
    // Protect against concurrent duplicate registrations.
    if (error.code === 11000) {
      const duplicateField = Object.keys(
        error.keyPattern || error.keyValue || {},
      )[0];

      if (duplicateField === "email") {
        return res.status(409).json({
          success: false,
          code: "EMAIL_ALREADY_REGISTERED",
          message: "An account with this email already exists. Please sign in.",
        });
      }

      if (duplicateField === "mobile_no") {
        return res.status(409).json({
          success: false,
          code: "MOBILE_ALREADY_REGISTERED",
          message: "This mobile number is already registered.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "An account with these details already exists.",
      });
    }

    console.error("User registration failed:", error.message);

    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode === 429 ? error.message : "Unable to create account.",
      success: false,
    });
  }
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
    const purpose = req.body.purpose;

    const existingUser = await UserModel.exists({ email });

    // Explicit duplicate-email response during signup.
    if (purpose === "user_signup" && existingUser) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_REGISTERED",
        message:
          "An account with this email already exists. Please sign in or use Forgot Password.",
      });
    }

    // Preserve generic responses for password reset
    // to prevent account enumeration.
    if (purpose === "user_signup" && !existingUser) {
      await generateSixDigitNumber(email, purpose);
    }

    if (purpose === "user_password_reset" && existingUser) {
      await generateSixDigitNumber(email, purpose);
    }

    return res.status(200).json({
      message:
        "If the email address is eligible, a verification code has been sent.",
      success: true,
    });
  } catch (error) {
    console.error("User OTP request failed:", error.message);

    return res.status(error.statusCode || 500).json({
      message: error.statusCode === 429 ? error.message : "Unable to send OTP.",
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
    const user = await UserModel.findOne({ email }).select(
      "+password +tokenVersion",
    );

    if (!user) {
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
      user.password,
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
        success: false,
      });
    }

    user.login_history.push(new Date());
    if (user.login_history.length > 50)
      user.login_history = user.login_history.slice(-50);
    await user.save();

    const token = signUserToken(user);

    return res.status(200).json({
      message: "Login Successfully",
      success: true,
      token,
    });
  } catch (error) {
    console.error("User login failed:", error.message);
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
      "user_password_reset",
    );
    if (!otpResult.valid) {
      return otpFailureResponse(res, otpResult.reason);
    }

    const user = await UserModel.findOne({ email }).select(
      "+password +tokenVersion",
    );
    if (!user) {
      return res.status(400).json({
        message: "Invalid recovery details.",
        success: false,
      });
    }

    user.password = await bcrypt.hash(
      String(req.body.password),
      PASSWORD_ROUNDS,
    );
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save();

    return res.status(200).json({
      message: "Password has changed.",
      success: true,
    });
  } catch (error) {
    console.error("User password reset failed:", error.message);
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
