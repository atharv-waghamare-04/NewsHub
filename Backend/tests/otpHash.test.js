const test = require("node:test");
const assert = require("node:assert/strict");

process.env.OTP_SECRET = "test-only-otp-secret-with-more-than-32-bytes";

const { createOtpHash } = require("../services/otpHash");

test("OTP HMAC is deterministic for normalized email, code and purpose", () => {
  const first = createOtpHash("Person@example.com", "123456", "user_signup");
  const second = createOtpHash(" person@example.com ", "123456", "user_signup");
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("OTP HMAC changes when email, code or purpose changes", () => {
  const baseline = createOtpHash("person@example.com", "123456", "user_signup");
  assert.notEqual(baseline, createOtpHash("other@example.com", "123456", "user_signup"));
  assert.notEqual(baseline, createOtpHash("person@example.com", "654321", "user_signup"));
  assert.notEqual(baseline, createOtpHash("person@example.com", "123456", "admin_password_reset"));
});

test("unknown OTP purposes are rejected", () => {
  assert.throws(
    () => createOtpHash("person@example.com", "123456", "unknown-purpose"),
    /Invalid OTP purpose/
  );
});
