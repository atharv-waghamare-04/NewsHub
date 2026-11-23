const crypto = require("node:crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const SubscriptionModel = require("../models/subscription.model");
const PaymentTransactionModel = require("../models/paymentTransaction.model");

if (!process.env.RAZORPAY_ID || !process.env.RAZORPAY_SECRET) {
  throw new Error("RAZORPAY_ID and RAZORPAY_SECRET must be configured.");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

function addOneYear(date) {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + 1);
  return result;
}

/**
 * The only function allowed to grant subscription entitlement.
 * Both the authenticated checkout callback and signed Razorpay webhook call it.
 */
async function processCapturedPayment({
  orderId,
  paymentId,
  checkoutSignature = null,
  verificationSource,
}) {
  if (!["checkout", "webhook", "reconciliation"].includes(verificationSource)) {
    throw new Error("INVALID_VERIFICATION_SOURCE");
  }

  if (
    typeof orderId !== "string" ||
    typeof paymentId !== "string" ||
    !orderId.startsWith("order_") ||
    !paymentId.startsWith("pay_")
  ) {
    throw new Error("INVALID_PAYMENT_IDENTIFIERS");
  }

  const localOrder = await PaymentTransactionModel.findOne({
    razorpay_order_id: orderId,
  });

  if (!localOrder) {
    const error = new Error("LOCAL_ORDER_NOT_FOUND");
    error.code = error.message;
    throw error;
  }

  // Always verify with Razorpay's API; never trust event/body amount or status.
  const [razorpayOrder, razorpayPayment] = await Promise.all([
    razorpay.orders.fetch(orderId),
    razorpay.payments.fetch(paymentId),
  ]);

  if (
    razorpayOrder.id !== orderId ||
    razorpayOrder.amount !== localOrder.amount_paise ||
    razorpayOrder.currency !== localOrder.currency ||
    razorpayOrder.notes?.user_id !== localOrder.user_id.toString() ||
    razorpayOrder.notes?.plan !== localOrder.plan
  ) {
    const error = new Error("ORDER_MISMATCH");
    error.code = error.message;
    throw error;
  }

  if (
    razorpayPayment.id !== paymentId ||
    razorpayPayment.order_id !== orderId ||
    razorpayPayment.amount !== localOrder.amount_paise ||
    razorpayPayment.currency !== localOrder.currency ||
    razorpayPayment.status !== "captured" ||
    razorpayPayment.captured !== true ||
    razorpayOrder.status !== "paid"
  ) {
    const error = new Error("PAYMENT_NOT_CAPTURED");
    error.code = error.message;
    throw error;
  }

  const session = await mongoose.startSession();
  let subscriptionEndDate;
  let alreadyProcessed = false;

  try {
    await session.withTransaction(
      async () => {
        const transaction = await PaymentTransactionModel.findOne({
          razorpay_order_id: orderId,
        }).session(session);

        if (!transaction) {
          const error = new Error("LOCAL_ORDER_NOT_FOUND");
          error.code = error.message;
          throw error;
        }

        if (transaction.status === "applied") {
          if (transaction.razorpay_payment_id === paymentId) {
            const existing = await SubscriptionModel.findOne({
              user_id: transaction.user_id,
            }).session(session);

            subscriptionEndDate = existing?.subscription_end_date;
            alreadyProcessed = true;
            return;
          }

          const error = new Error("ORDER_ALREADY_PROCESSED");
          error.code = error.message;
          throw error;
        }

        if (
          transaction.amount_paise !== localOrder.amount_paise ||
          transaction.currency !== localOrder.currency ||
          transaction.plan !== localOrder.plan
        ) {
          const error = new Error("LOCAL_ORDER_MISMATCH");
          error.code = error.message;
          throw error;
        }

        const reusedPayment = await PaymentTransactionModel.findOne({
          razorpay_payment_id: paymentId,
          _id: { $ne: transaction._id },
        }).session(session);

        if (reusedPayment) {
          const error = new Error("PAYMENT_ALREADY_USED");
          error.code = error.message;
          throw error;
        }

        const now = new Date();
        const currentSubscription = await SubscriptionModel.findOne({
          user_id: transaction.user_id,
        }).session(session);

        const currentExpiry = currentSubscription?.subscription_end_date;
        const startsAt =
          currentExpiry && new Date(currentExpiry) > now
            ? new Date(currentExpiry)
            : now;

        subscriptionEndDate = addOneYear(startsAt);

        const subscriptionFields = {
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          // Checkout signature is available only on the browser verification path.
          razorpay_signature: checkoutSignature || undefined,
          verification_source: verificationSource,
          subscription_start_date: startsAt,
          subscription_end_date: subscriptionEndDate,
          amount: transaction.amount_paise / 100,
          token_id: crypto.randomBytes(32).toString("hex"),
          status: "Active",
        };

        if (currentSubscription) {
          Object.assign(currentSubscription, subscriptionFields);
          await currentSubscription.save({ session });
        } else {
          await SubscriptionModel.create(
            [
              {
                user_id: transaction.user_id,
                ...subscriptionFields,
              },
            ],
            { session },
          );
        }

        transaction.razorpay_payment_id = paymentId;
        transaction.razorpay_signature = checkoutSignature || undefined;
        transaction.verification_source = verificationSource;
        transaction.status = "applied";
        transaction.captured_at = razorpayPayment.created_at
          ? new Date(razorpayPayment.created_at * 1000)
          : now;
        transaction.applied_at = now;

        await transaction.save({ session });
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
      },
    );

    return {
      success: true,
      alreadyProcessed,
      subscriptionEndDate,
    };
  } finally {
    await session.endSession();
  }
}

module.exports = { processCapturedPayment };
