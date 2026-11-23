const Razorpay = require("razorpay");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const UserModel = require("../models/user.model");
const SubscriptionModel = require("../models/subscription.model");
const PaymentTransactionModel = require("../models/paymentTransaction.model");
const RazorpayWebhookEventModel = require("../models/razorpayWebhookEvent.model");

const {
  verifyCheckoutSignature,
} = require("../services/paymentSecurity");
const {
  processCapturedPayment,
} = require("../services/paymentProcessing");

if (!process.env.RAZORPAY_ID || !process.env.RAZORPAY_SECRET) {
  throw new Error("RAZORPAY_ID and RAZORPAY_SECRET must be configured.");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

function getSubscriptionPrice() {
  const price = Number(process.env.SUBSCRIPTION_PRICE);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("SUBSCRIPTION_PRICE must be a positive number in INR.");
  }

  const amountPaise = Math.round(price * 100);
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new Error("SUBSCRIPTION_PRICE is outside the supported payment range.");
  }

  return { priceRupees: amountPaise / 100, amountPaise };
}

function isReplicaSetTransactionUnavailable(error) {
  return (
    error?.code === 20 ||
    /Transaction numbers are only allowed|replica set|mongos/i.test(error?.message || "")
  );
}

function sendPaymentError(res, error, context) {
  if (isReplicaSetTransactionUnavailable(error)) {
    console.error(`${context}: MongoDB transaction support is unavailable:`, error.message);
    return res.status(503).json({
      success: false,
      code: "TRANSACTIONS_UNAVAILABLE",
      message: "Payment was confirmed but subscription activation requires MongoDB replica-set transaction support. No entitlement was granted; retry after fixing database configuration.",
    });
  }

  const knownErrors = {
    LOCAL_ORDER_NOT_FOUND: [404, "Payment order was not found."],
    ORDER_MISMATCH: [409, "The Razorpay order does not match the recorded NewsHub order."],
    PAYMENT_NOT_CAPTURED: [409, "Payment has not been captured. Subscription was not activated."],
    ORDER_ALREADY_PROCESSED: [409, "This order has already been processed with another payment."],
    PAYMENT_ALREADY_USED: [409, "This payment is already associated with another order."],
    LOCAL_ORDER_MISMATCH: [409, "The recorded order does not match the verified payment."],
  };

  const known = knownErrors[error?.code || error?.message];
  if (known) {
    return res.status(known[0]).json({
      success: false,
      message: known[1],
    });
  }

  console.error(`${context}:`, error?.message || error);
  return res.status(502).json({
    success: false,
    message: "Unable to process payment confirmation right now. Please retry.",
  });
}

const create_order = async (req, res) => {
  try {
    const user = await UserModel.findById(req.token?._id).select("_id");
    if (!user) {
      return res.status(401).json({
        message: "Authentication required.",
        success: false,
      });
    }

    const existingSubscription = await SubscriptionModel.findOne({
      user_id: user._id,
      status: "Active",
      subscription_end_date: { $gt: new Date() },
    }).select("_id subscription_end_date");

    if (existingSubscription) {
      return res.status(409).json({
        message: "An active subscription already exists.",
        success: false,
        subscription_end_date: existingSubscription.subscription_end_date,
      });
    }

    const { priceRupees, amountPaise } = getSubscriptionPrice();
    const receipt = `nh-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        product: "NewsHub annual subscription",
        user_id: user._id.toString(),
        plan: "annual",
      },
    });

    if (
      !order?.id ||
      order.amount !== amountPaise ||
      order.currency !== "INR" ||
      order.status !== "created"
    ) {
      throw new Error("Razorpay returned an unexpected order response.");
    }

    await PaymentTransactionModel.create({
      user_id: user._id,
      razorpay_order_id: order.id,
      receipt: order.receipt || receipt,
      amount_paise: amountPaise,
      currency: "INR",
      plan: "annual",
      status: "created",
    });

    return res.status(201).json({
      message: "Order created successfully.",
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      amount_inr: priceRupees,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An order with this identifier has already been recorded.",
        success: false,
      });
    }

    console.error("Razorpay order creation failed:", error.message);
    return res.status(502).json({
      message: "Unable to create payment order.",
      success: false,
    });
  }
};

const order_verify = async (req, res) => {
  try {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      return res.status(400).json({
        message: "Validation Errors",
        errors: validation.array(),
        success: false,
      });
    }

    const user = await UserModel.findById(req.token?._id).select("_id");
    if (!user) {
      return res.status(401).json({
        message: "Authentication required.",
        success: false,
      });
    }

    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;

    const localOrder = await PaymentTransactionModel.findOne({
      razorpay_order_id: orderId,
      user_id: user._id,
    });

    if (!localOrder) {
      return res.status(404).json({
        message: "Payment order was not found for this account.",
        success: false,
      });
    }

    if (!verifyCheckoutSignature(orderId, paymentId, signature, process.env.RAZORPAY_SECRET)) {
      return res.status(400).json({
        message: "Payment signature verification failed.",
        success: false,
      });
    }

    const result = await processCapturedPayment({
      orderId,
      paymentId,
      checkoutSignature: signature,
      verificationSource: "checkout",
    });

    return res.status(200).json({
      message: result.alreadyProcessed
        ? "This payment has already been verified."
        : "Payment verified and subscription activated.",
      success: true,
      already_verified: result.alreadyProcessed,
      subscription_end_date: result.subscriptionEndDate,
    });
  } catch (error) {
    return sendPaymentError(res, error, "Razorpay checkout verification failed");
  }
};

function safeHexSignatureMatch(received, expected) {
  if (
    typeof received !== "string" ||
    !/^[a-f0-9]{64}$/i.test(received) ||
    !/^[a-f0-9]{64}$/i.test(expected)
  ) {
    return false;
  }

  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

const handle_razorpay_webhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.get("X-Razorpay-Signature");
  const eventId = req.get("X-Razorpay-Event-Id");

  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not configured.");
    return res.status(503).json({ success: false, message: "Webhook is not configured." });
  }

  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ success: false, message: "Webhook raw body is missing. Check middleware order." });
  }

  if (!eventId || eventId.length > 255 || !signature) {
    return res.status(400).json({ success: false, message: "Required webhook headers are missing." });
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(req.body)
    .digest("hex");

  if (!safeHexSignatureMatch(signature, expectedSignature)) {
    return res.status(400).json({ success: false, message: "Webhook signature verification failed." });
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ success: false, message: "Webhook body is not valid JSON." });
  }

  const eventType = payload?.event;
  const payment = payload?.payload?.payment?.entity;

  // Only captured payments grant subscription access. Other configured events
  // are acknowledged and logged, but never grant entitlement.
  if (!["payment.captured", "payment.failed", "order.paid"].includes(eventType)) {
    return res.status(200).json({ success: true, message: "Event ignored." });
  }

  const now = new Date();
  const leaseUntil = new Date(now.getTime() + 2 * 60 * 1000);
  let eventRecord;

  try {
    try {
      eventRecord = await RazorpayWebhookEventModel.findOneAndUpdate(
        {
          event_id: eventId,
          $or: [
            { status: "failed" },
            { status: "processing", lease_until: { $lte: now } },
          ],
        },
        {
          $set: {
            event_type: eventType,
            status: "processing",
            lease_until: leaseUntil,
            razorpay_order_id: payment?.order_id,
            razorpay_payment_id: payment?.id,
            last_error: undefined,
          },
        },
        { returnDocument: "after" }
      );

      if (!eventRecord) {
        try {
          eventRecord = await RazorpayWebhookEventModel.create({
            event_id: eventId,
            event_type: eventType,
            status: "processing",
            lease_until: leaseUntil,
            razorpay_order_id: payment?.order_id,
            razorpay_payment_id: payment?.id,
          });
        } catch (createError) {
          if (createError.code !== 11000) throw createError;

          const existing = await RazorpayWebhookEventModel.findOne({ event_id: eventId });
          if (existing?.status === "processed") {
            return res.status(200).json({ success: true, message: "Event already processed." });
          }

          // A different worker owns a live lease. Return a retryable response
          // instead of acknowledging an event that has not completed.
          return res.status(409).json({ success: false, message: "Event is currently being processed. Retry delivery." });
        }
      }

      if (eventType === "payment.captured") {
        if (!payment?.id || !payment?.order_id) {
          throw new Error("Webhook payment payload is incomplete.");
        }

        await processCapturedPayment({
          orderId: payment.order_id,
          paymentId: payment.id,
          verificationSource: "webhook",
        });
      }

      await RazorpayWebhookEventModel.updateOne(
        { _id: eventRecord._id, status: "processing" },
        {
          $set: {
            status: "processed",
            processed_at: new Date(),
          },
          $unset: { lease_until: "", last_error: "" },
        }
      );

      return res.status(200).json({ success: true, message: "Webhook processed." });
    } catch (error) {
      if (eventRecord?._id) {
        await RazorpayWebhookEventModel.updateOne(
          { _id: eventRecord._id },
          {
            $set: {
              status: "failed",
              last_error: String(error.message || "Processing failed").slice(0, 500),
            },
            $unset: { lease_until: "" },
          }
        ).catch((updateError) => {
          console.error("Could not update webhook event failure state:", updateError.message);
        });
      }

      console.error("Razorpay webhook processing failed:", error.message);
      // Non-2xx tells Razorpay to retry. The unique event ID and payment ledger
      // make retries safe.
      return res.status(500).json({ success: false, message: "Webhook processing failed. Retry delivery." });
    }
  } catch (error) {
    console.error("Razorpay webhook event persistence failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to persist webhook event." });
  }
};

const show_token_id = async (req, res) => {
  try {
    const user = await UserModel.findById(req.token?._id).select("_id");
    if (!user) {
      return res.status(401).json({
        message: "Authentication required.",
        success: false,
      });
    }

    const subscription = await SubscriptionModel.findOne({
      user_id: user._id,
      status: "Active",
      subscription_end_date: { $gt: new Date() },
    }).select("+token_id");

    if (!subscription) {
      return res.status(404).json({
        message: "An active subscription was not found.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Subscription token fetched successfully.",
      success: true,
      token_id: subscription.token_id,
      subscription_end_date: subscription.subscription_end_date,
    });
  } catch (error) {
    console.error("Subscription token lookup failed:", error.message);
    return res.status(500).json({
      message: "Unable to fetch subscription token.",
      success: false,
    });
  }
};

module.exports = {
  create_order,
  order_verify,
  show_token_id,
  handle_razorpay_webhook,
};
