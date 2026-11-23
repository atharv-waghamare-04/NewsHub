const crypto = require("node:crypto");

function safeCompareHex(actualHex, expectedHex) {
  if (
    typeof actualHex !== "string" ||
    typeof expectedHex !== "string" ||
    !/^[a-f0-9]{64}$/i.test(actualHex) ||
    !/^[a-f0-9]{64}$/i.test(expectedHex)
  ) {
    return false;
  }

  const actual = Buffer.from(actualHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");

  return actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected);
}

function createCheckoutSignature(orderId, paymentId, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

function verifyCheckoutSignature(orderId, paymentId, signature, secret) {
  if (
    typeof orderId !== "string" ||
    typeof paymentId !== "string" ||
    typeof secret !== "string" ||
    !secret
  ) {
    return false;
  }

  return safeCompareHex(
    signature,
    createCheckoutSignature(orderId, paymentId, secret)
  );
}

module.exports = {
  safeCompareHex,
  createCheckoutSignature,
  verifyCheckoutSignature,
};
