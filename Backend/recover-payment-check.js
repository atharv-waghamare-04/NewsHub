require("dotenv").config();

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

async function verifyExistingPayment() {
  const orderId = "order_U3au1VOnfFgkiA";
  const paymentId = "pay_U3b6nrlkI9TTpd";

  try {
    const [order, payment] = await Promise.all([
      razorpay.orders.fetch(orderId),
      razorpay.payments.fetch(paymentId),
    ]);

    console.log("\n--- VERIFIED ORDER ---");

    console.log({
      id: order.id,
      status: order.status,
      amount: order.amount,
      amount_paid: order.amount_paid,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
    });

    console.log("\n--- VERIFIED PAYMENT ---");

    console.log({
      id: payment.id,
      order_id: payment.order_id,
      status: payment.status,
      captured: payment.captured,
      amount: payment.amount,
      currency: payment.currency,
    });
  } catch (error) {
    console.error("Verification failed:", error.message);
    process.exitCode = 1;
  }
}

verifyExistingPayment();
