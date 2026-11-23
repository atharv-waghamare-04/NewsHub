let scriptPromise;

export const loadRazorpayCheckout = () => {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => window.Razorpay ? resolve() : reject(new Error("Checkout could not be loaded."));
    script.onerror = () => reject(new Error("Checkout could not be loaded. Please try again."));
    document.body.appendChild(script);
  }).catch((error) => {
    scriptPromise = null;
    document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')?.remove();
    throw error;
  });

  return scriptPromise;
};
