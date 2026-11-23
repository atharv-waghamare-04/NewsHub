require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const AdminModel = require("../models/admin.model");

async function createInitialAdmin() {
  const { BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_MOBILE, BOOTSTRAP_ADMIN_PASSWORD, MONGO_DB_URL } = process.env;

  if (!MONGO_DB_URL) throw new Error("MONGO_DB_URL is required.");
  if (!BOOTSTRAP_ADMIN_NAME || !BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_MOBILE || !BOOTSTRAP_ADMIN_PASSWORD) {
    throw new Error("Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_MOBILE and BOOTSTRAP_ADMIN_PASSWORD in Backend/.env before running this script.");
  }
  const passwordBytes = Buffer.byteLength(BOOTSTRAP_ADMIN_PASSWORD, "utf8");
  if (passwordBytes < 12 || passwordBytes > 72) {
    throw new Error("Bootstrap admin password must be 12–72 bytes long.");
  }

  await mongoose.connect(MONGO_DB_URL);

  const adminCount = await AdminModel.countDocuments();
  if (adminCount > 0) {
    throw new Error("An administrator already exists. Bootstrap is only for the first admin.");
  }

  const password = await bcrypt.hash(BOOTSTRAP_ADMIN_PASSWORD, 12);
  await AdminModel.create({
    name: BOOTSTRAP_ADMIN_NAME.trim(),
    email: BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase(),
    mobile_no: BOOTSTRAP_ADMIN_MOBILE.trim(),
    password,
    login_history: [],
  });

  console.log("Initial NewsHub administrator created successfully.");
}

createInitialAdmin()
  .catch((error) => {
    console.error("Admin bootstrap failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
