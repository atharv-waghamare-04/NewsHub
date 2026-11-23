const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");

const {
  create_order,
  order_verify,
  show_token_id,
  handle_razorpay_webhook,
} = require("../controller/subscription.controller");

const verifyToken = require("../middleware/verifyToken");
const requireRole = require("../middleware/requireRole");

const router = express.Router();
const requireUser = requireRole("user");

const paymentActionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many payment attempts. Please try again later.",
  },
});

// Razorpay authenticates this endpoint using its HMAC webhook signature.
// Do not add JWT middleware to this route.
router.post("/webhook", handle_razorpay_webhook);

router.post(
  "/create-new-order",
  verifyToken,
  requireUser,
  paymentActionLimiter,
  create_order
);

router.post(
  "/verify-payment",
  verifyToken,
  requireUser,
  paymentActionLimiter,
  body("razorpay_order_id")
    .isString()
    .trim()
    .matches(/^order_[A-Za-z0-9]+$/)
    .withMessage("Razorpay order ID is invalid."),
  body("razorpay_payment_id")
    .isString()
    .trim()
    .matches(/^pay_[A-Za-z0-9]+$/)
    .withMessage("Razorpay payment ID is invalid."),
  body("razorpay_signature")
    .isString()
    .trim()
    .matches(/^[a-fA-F0-9]{64}$/)
    .withMessage("Razorpay signature is invalid."),
  order_verify
);

router.post(
  "/get-my-token",
  verifyToken,
  requireUser,
  show_token_id
);

module.exports = router;
