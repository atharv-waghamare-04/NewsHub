const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const requiredEnv = ["SMTP_USER", "SMTP_APP_PASSWORD"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(
    `Missing required email configuration: ${missingEnv.join(", ")}`,
  );
}

const smtpPort = Number.parseInt(process.env.SMTP_PORT || "587", 10);

if (!Number.isInteger(smtpPort) || smtpPort <= 0) {
  throw new Error("SMTP_PORT must be a valid positive port number.");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: smtpPort,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_APP_PASSWORD,
  },
});

module.exports = transporter;
