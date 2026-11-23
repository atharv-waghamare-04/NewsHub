const jwt = require("jsonwebtoken");
const AdminModel = require("../models/admin.model");
const UserModel = require("../models/user.model");
const { isTokenVersionValid } = require("../services/authSecurity");

async function verify_token(req, res, next) {
  try {
    const authorization = req.headers.authorization;
    const bearerToken =
      authorization && authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : null;

    // Legacy token header retained temporarily for existing clients.
    const token = bearerToken || req.headers.token;

    if (!token) {
      return res.status(401).json({
        message: "Authentication token is required.",
        success: false,
      });
    }

    if (
      !process.env.JWT_SECRET ||
      Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32
    ) {
      throw new Error("JWT_SECRET is not configured securely.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "newshub-api",
      audience: "newshub-client",
    });

    if (
      !decoded.exp ||
      decoded.exp * 1000 <= Date.now() ||
      !Number.isInteger(decoded.ver) ||
      !decoded._id ||
      !["admin", "user"].includes(decoded.role)
    ) {
      return res.status(401).json({
        message: "Session expired or invalid. Please sign in again.",
        success: false,
      });
    }

    const AccountModel = decoded.role === "admin" ? AdminModel : UserModel;
    const account = await AccountModel.findById(decoded._id)
      .select("_id +tokenVersion")
      .lean();

    if (!account || !isTokenVersionValid(decoded.ver, account.tokenVersion)) {
      return res.status(401).json({
        message: "Your session is no longer valid. Please sign in again.",
        success: false,
      });
    }

    req.token = decoded;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired. Please sign in again.",
        success: false,
      });
    }

    if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
      return res.status(401).json({
        message: "Invalid authentication token.",
        success: false,
      });
    }

    console.error("Authentication middleware error:", error.message);
    return res.status(500).json({
      message: "Unable to verify authentication.",
      success: false,
    });
  }
}

module.exports = verify_token;
