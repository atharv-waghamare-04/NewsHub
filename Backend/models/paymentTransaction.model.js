const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "nh_user_details",
      required: true,
      index: true,
    },
    razorpay_order_id: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    razorpay_payment_id: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
    },
    receipt: {
      type: String,
      required: true,
      immutable: true,
    },
    amount_paise: {
      type: Number,
      required: true,
      min: 1,
      immutable: true,
    },
    currency: {
      type: String,
      required: true,
      enum: ["INR"],
      default: "INR",
      immutable: true,
    },
    plan: {
      type: String,
      required: true,
      enum: ["annual"],
      default: "annual",
      immutable: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["created", "applied"],
      default: "created",
      index: true,
    },
    razorpay_signature: {
      type: String,
      select: false,
    },
    verification_source: {
      type: String,
      enum: ["checkout", "webhook", "reconciliation"],
    },
    captured_at: Date,
    applied_at: Date,
  },
  { timestamps: true },
);

paymentTransactionSchema.index({ user_id: 1, createdAt: -1 });
paymentTransactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model(
  "nh_payment_transaction",
  paymentTransactionSchema,
);
