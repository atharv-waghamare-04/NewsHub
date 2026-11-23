const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "nh_user_details",
      required: true,
      unique: true,
    },
    razorpay_payment_id: {
      type: String,
      required: true,
      unique: true,
    },
    razorpay_order_id: {
      type: String,
      required: true,
      unique: true,
    },
    // Checkout callback signature is not present in webhook deliveries.
    razorpay_signature: {
      type: String,
      required: false,
      select: false,
    },
    verification_source: {
      type: String,
      enum: ["checkout", "webhook", "reconciliation"],
      required: true,
    },
    subscription_start_date: {
      type: Date,
      required: true,
    },
    subscription_end_date: {
      type: Date,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    token_id: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    status: {
      type: String,
      required: true,
      enum: ["Active", "Inactive"],
      index: true,
    },
  },
  { timestamps: true },
);

subscriptionSchema.index({ user_id: 1, status: 1, subscription_end_date: 1 });

module.exports = mongoose.model("nh_subscription_details", subscriptionSchema);
