require("dotenv").config();

const mongoose = require("mongoose");
mongoose.set("autoIndex", false);

const OTPModel = require("../models/otp.model");

async function migrateAuthSecurity() {
  if (!process.env.MONGO_DB_URL) {
    throw new Error("MONGO_DB_URL must be configured.");
  }

  await mongoose.connect(process.env.MONGO_DB_URL);
  const collection = OTPModel.collection;

  // Old OTP records were not purpose-scoped. Delete them rather than guessing
  // whether a code was intended for signup, user reset, or administrator reset.
  const removedOtpRecords = await collection.deleteMany({});

  const indexes = await collection.indexes();
  for (const index of indexes) {
    const isEmailIndex = Boolean(index.key?.email);
    if (isEmailIndex) {
      await collection.dropIndex(index.name);
    }
  }

  await collection.createIndex(
    { email: 1, purpose: 1 },
    { unique: true, name: "email_1_purpose_1" }
  );

  await collection.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "expiresAt_1" }
  );

  console.log(
    `Auth security migration complete. Invalidated ${removedOtpRecords.deletedCount} old OTP record(s); purpose-scoped unique index is ready. Users must request fresh OTPs.`
  );
}

migrateAuthSecurity()
  .catch((error) => {
    console.error("Auth security migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
