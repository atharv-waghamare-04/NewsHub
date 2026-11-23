require("dotenv").config();

const mongoose = require("mongoose");
const SubscriptionModel = require("../models/subscription.model");
const PaymentTransactionModel = require("../models/paymentTransaction.model");

async function migrate() {
  if (!process.env.MONGO_DB_URL) {
    throw new Error("MONGO_DB_URL must be configured.");
  }

  await mongoose.connect(process.env.MONGO_DB_URL);
  // Ensure unique order/payment indexes exist before new verification traffic is enabled.
  await PaymentTransactionModel.createIndexes();

  const subscriptions = await SubscriptionModel.find({
    razorpay_order_id: { $exists: true, $ne: "" },
    razorpay_payment_id: { $exists: true, $ne: "" },
  }).lean();

  let migrated = 0;
  let skipped = 0;

  for (const subscription of subscriptions) {
    try {
      const amountPaise = Math.round(Number(subscription.amount) * 100);

      if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
        console.warn(`Skipping subscription ${subscription._id}: invalid amount.`);
        skipped += 1;
        continue;
      }

      await PaymentTransactionModel.updateOne(
        { razorpay_order_id: subscription.razorpay_order_id },
        {
          $setOnInsert: {
            user_id: subscription.user_id,
            razorpay_order_id: subscription.razorpay_order_id,
            receipt: `legacy-${subscription.razorpay_order_id}`,
            razorpay_payment_id: subscription.razorpay_payment_id,
            amount_paise: amountPaise,
            currency: "INR",
            plan: "annual",
            status: "applied",
            captured_at: subscription.updatedAt || subscription.createdAt || new Date(),
            applied_at: subscription.updatedAt || subscription.createdAt || new Date(),
          },
        },
        { upsert: true }
      );

      migrated += 1;
    } catch (error) {
      if (error.code === 11000) {
        console.warn(`Skipping duplicate legacy payment for subscription ${subscription._id}.`);
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  console.log(`Payment ledger migration complete. Migrated: ${migrated}; skipped: ${skipped}.`);
}

migrate()
  .catch((error) => {
    console.error("Payment ledger migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
