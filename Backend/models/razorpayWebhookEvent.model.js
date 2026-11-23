const mongoose = require("mongoose");

const razorpayWebhookEventSchema = new mongoose.Schema(
  {
    event_id: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    event_type: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["processing", "processed", "failed"],
      required: true,
      default: "processing",
      index: true,
    },
    lease_until: {
      type: Date,
      index: true,
    },
    razorpay_order_id: String,
    razorpay_payment_id: String,
    last_error: {
      type: String,
      maxlength: 500,
    },
    processed_at: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "nh_razorpay_webhook_event",
  razorpayWebhookEventSchema
);
