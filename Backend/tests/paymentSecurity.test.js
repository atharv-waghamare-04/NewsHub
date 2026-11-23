const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createCheckoutSignature,
  safeCompareHex,
  verifyCheckoutSignature,
} = require("../services/paymentSecurity");

test("valid checkout HMAC is accepted", () => {
  const secret = "test-secret-not-for-production";
  const signature = createCheckoutSignature("order_123", "pay_456", secret);
  assert.equal(
    verifyCheckoutSignature("order_123", "pay_456", signature, secret),
    true
  );
});

test("wrong secret or altered payment ID is rejected", () => {
  const signature = createCheckoutSignature("order_123", "pay_456", "secret-a");
  assert.equal(verifyCheckoutSignature("order_123", "pay_456", signature, "secret-b"), false);
  assert.equal(verifyCheckoutSignature("order_123", "pay_999", signature, "secret-a"), false);
});

test("malformed signature is rejected without throwing", () => {
  assert.equal(safeCompareHex("not-a-signature", "a".repeat(64)), false);
  assert.equal(verifyCheckoutSignature("order_123", "pay_456", "x", "secret"), false);
});

test("hex comparison is case-insensitive for valid hexadecimal values", () => {
  const lower = "ab".repeat(32);
  assert.equal(safeCompareHex(lower.toUpperCase(), lower), true);
});
