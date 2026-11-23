require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("node:path");

const transporter = require("./services/nodemailer");
const dbToConnect = require("./db/db");
const adminRouter = require("./routes/admin.routes");
const categoryRouter = require("./routes/catagory.routes");
const newsRouter = require("./routes/news.routes");
const subscriptionRouter = require("./routes/subscription.routes");
const userRouter = require("./routes/user.routes");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP CONNECTION FAILED:", error.message);
  } else {
    console.log("SMTP SERVER READY:", success);
  }
});

const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header (for example, server-to-server or CLI)
    // are not browser cross-origin requests and can be allowed.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin is not allowed by CORS."));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Razorpay-Signature",
    "X-Razorpay-Event-Id",
  ],
  credentials: true,
  optionsSuccessStatus: 204,
};

const createRateLimiter = (limit) =>
  rateLimit({
    windowMs: 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

app.use(cors(corsOptions));
app.use(
  "/api/subscription/webhook",
  express.raw({
    type: "application/json",
    limit: "1mb",
  }),
);
app.use(express.json({ limit: "1mb" }));

app.use("/api/user", createRateLimiter(100));
app.use("/api/admin", createRateLimiter(100));
app.use("/api/category", createRateLimiter(100));
app.use("/api/news", createRateLimiter(100));
app.use("/api/subscription", createRateLimiter(100));

app.use(
  "/api/assets",
  express.static(path.resolve(__dirname, "statics"), {
    dotfiles: "deny",
    index: false,
  }),
);
app.use("/api/admin", adminRouter);
app.use("/api/category", categoryRouter);
app.use("/api/news", newsRouter);
app.use("/api/subscription", subscriptionRouter);
app.use("/api/user", userRouter);

app.use((error, req, res, next) => {
  if (error && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "Uploaded image exceeds the 5 MB size limit.",
    });
  }

  if (error && error.name === "MulterError") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid file upload." });
  }

  if (
    error &&
    error.message === "Only JPEG, PNG, and WebP images are allowed."
  ) {
    return res.status(400).json({ success: false, message: error.message });
  }

  if (error && error.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ success: false, message: "Malformed JSON request body." });
  }

  if (error && error.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({
      success: false,
      message: "This origin is not allowed.",
    });
  }

  console.error("Unhandled application error:", error.message);

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

const PORT = Number.parseInt(process.env.PORT || "5000", 10);

async function startServer() {
  try {
    await dbToConnect();

    app.listen(PORT, () => {
      console.log(`NewsHub API is running on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      "Unable to start NewsHub because the database connection failed.",
    );
    process.exit(1);
  }
}

startServer();

module.exports = app;
