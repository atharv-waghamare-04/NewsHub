import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { getUserSession } from "./userSession";
import { loadRazorpayCheckout } from "./razorpayCheckout";
import { apiRequest } from "../../lib/api";
import "./BuyNow.css";

const checkoutKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "";
const isTestMode = checkoutKey.startsWith("rzp_test_");
const liveCheckoutEnabled = import.meta.env.VITE_ENABLE_LIVE_CHECKOUT === "true";

const requestSubscription = (endpoint, token, body) =>
  apiRequest(`/api/subscription/${endpoint}`, { method: "POST", token, body });

const BuyNow = () => {
  const navigate = useNavigate();
  const [{ token, email }] = useState(getUserSession);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const busy = ["ordering", "loading-checkout", "checkout", "verifying"].includes(phase);
  const canOpenCheckout = Boolean(checkoutKey) && (isTestMode || liveCheckoutEnabled);

  const verifyPayment = async (checkoutResponse, createdOrder) => {
    setPhase("verifying");
    setError("");
    setPayment(checkoutResponse);

    try {
      if (!checkoutResponse.razorpay_payment_id || !checkoutResponse.razorpay_signature || checkoutResponse.razorpay_order_id !== createdOrder.id) {
        throw new Error("The checkout response did not match this order.");
      }
      await requestSubscription("verify-payment", token, {
        razorpay_order_id: createdOrder.id,
        razorpay_payment_id: checkoutResponse.razorpay_payment_id,
        razorpay_signature: checkoutResponse.razorpay_signature,
      });
      setPhase("verified");
      setNotice("Your payment has been verified.");
    } catch (cause) {
      setPhase("verification-failed");
      setError(cause.message || "Payment verification could not be completed.");
    }
  };

  const startCheckout = async () => {
    if (!token) {
      navigate("/login", { state: { returnTo: "/buy-now" } });
      return;
    }
    if (!canOpenCheckout || busy) return;

    setError("");
    setNotice("");
    setPhase("ordering");

    try {
      const result = await requestSubscription("create-new-order", token, {});
      const createdOrder = result.order;
      if (!createdOrder?.id || !Number.isSafeInteger(createdOrder.amount) || createdOrder.amount <= 0 || createdOrder.currency !== "INR") {
        throw new Error("The order response is incomplete. Please try again.");
      }
      setOrder(createdOrder);
      setPhase("loading-checkout");
      await loadRazorpayCheckout();

      let completed = false;
      let failed = false;
      const checkout = new window.Razorpay({
        key: checkoutKey,
        amount: createdOrder.amount,
        currency: createdOrder.currency,
        name: "NewsHub",
        description: "One-year NewsHub subscription",
        order_id: createdOrder.id,
        prefill: { email: email || "" },
        theme: { color: "#19373b" },
        handler: (checkoutResponse) => {
          completed = true;
          verifyPayment(checkoutResponse, createdOrder);
        },
        modal: {
          ondismiss: () => {
            if (!completed) {
              setPhase("idle");
              if (!failed) setNotice("Checkout was closed. No payment was confirmed.");
            }
          },
        },
      });
      checkout.on("payment.failed", (response) => {
        failed = true;
        setPhase("idle");
        setError(response.error?.description || "The payment did not go through. Please try again.");
      });
      setPhase("checkout");
      checkout.open();
    } catch (cause) {
      setPhase("idle");
      setError(cause.message || "Checkout could not be started. Please try again.");
    }
  };

  const retryVerification = () => {
    if (payment && order) verifyPayment(payment, order);
  };

  const formattedAmount = order && new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(order.amount / 100);

  return (
    <main className="buy-page">
      <header className="buy-header">
        <Link className="site-brand" to="/" aria-label="NewsHub home"><img src="/newshub-mark.svg" alt="" /><span>NewsHub<span>.</span></span></Link>
        <nav aria-label="Main navigation"><Link to="/">Home</Link><span aria-current="page">Membership</span><Link to="/news-api">API guide</Link>{!token && <Link to="/login" state={{ returnTo: "/buy-now" }}>Sign in</Link>}</nav>
      </header>

      <div className="buy-shell">
        <div className="buy-breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><strong>Membership</strong></div>
        <section className="buy-hero">
          <div className="buy-copy">
            <span className="buy-eyebrow"><i /> THE NEWSHUB MEMBERSHIP</span>
            <h1>More stories.<br /><em>More perspective.</em></h1>
            <p>Get one year of access to subscriber stories with a single, secure checkout.</p>
            <div className="buy-benefits"><div><span>✓</span> One-year subscription</div><div><span>✓</span> Access to subscriber stories</div><div><span>✓</span> Secure Razorpay checkout</div></div>
          </div>

          <div className="buy-plan-card">
            <div className="buy-plan-top"><span>ANNUAL ACCESS</span><span className="buy-plan-mark" aria-hidden="true">N.</span></div>
            <h2>NewsHub Plus<span>.</span></h2>
            <p>A year of stories that help you see the bigger picture.</p>
            <div className="buy-price"><strong>{formattedAmount || "Annual plan"}</strong><span>{formattedAmount ? "for one year" : "Final price shown at checkout"}</span></div>

            {isTestMode && <div className="buy-test-badge">Test checkout · No real payment</div>}
            {!checkoutKey && <p className="buy-config-note">Checkout is not configured. Add the public Razorpay key ID to the frontend environment.</p>}
            {checkoutKey && !canOpenCheckout && <p className="buy-config-note">Live checkout is disabled until payment verification is ready.</p>}

            {phase === "verified" ? (
              <div className="buy-success" role="status"><strong>Payment verified</strong><span>Keep your payment ID for your records.</span><Link to="/news-api">View your API token →</Link></div>
            ) : phase === "verification-failed" ? (
              <button className="buy-primary" type="button" onClick={retryVerification}>Retry verification <span aria-hidden="true">→</span></button>
            ) : (
              <button className="buy-primary" type="button" onClick={startCheckout} disabled={busy || (token && !canOpenCheckout)}>
                <span>{!token ? "Sign in to buy" : phase === "ordering" ? "Creating order..." : phase === "loading-checkout" ? "Opening checkout..." : phase === "checkout" ? "Checkout open" : phase === "verifying" ? "Verifying payment..." : "Buy now"}</span><span aria-hidden="true">→</span>
              </button>
            )}
            <span className="buy-card-footnote">The amount and payment method are confirmed in Razorpay Checkout.</span>
          </div>
        </section>

        {notice && <div className="buy-notice" role="status">{notice}</div>}
        {error && <div className="buy-error" role="alert"><strong>{phase === "verification-failed" ? "Verification needs attention" : "Could not continue"}</strong><p>{error}</p>{phase === "verification-failed" && <p>A payment response was received. Please do not pay again until this order is resolved.</p>}</div>}
        {phase === "verification-failed" && <div className="buy-reference"><span>Order ID: <strong>{order?.id}</strong></span><span>Payment ID: <strong>{payment?.razorpay_payment_id}</strong></span></div>}

        <section className="buy-steps" aria-label="How checkout works"><div><span>01</span><h3>Sign in</h3><p>Use your NewsHub account to keep your purchase connected to you.</p></div><div><span>02</span><h3>Complete checkout</h3><p>The final amount is shown before you choose a payment method.</p></div><div><span>03</span><h3>Verify payment</h3><p>We confirm the payment with our server before showing a verified result.</p></div></section>
      </div>
    </main>
  );
};

export default BuyNow;
