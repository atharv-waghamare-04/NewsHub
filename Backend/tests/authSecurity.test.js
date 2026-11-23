const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isPasswordWithinBcryptLimit,
  isTokenVersionValid,
} = require("../services/authSecurity");

test("password policy enforces 12 to 72 UTF-8 bytes", () => {
  assert.equal(isPasswordWithinBcryptLimit("short"), false);
  assert.equal(isPasswordWithinBcryptLimit("correct-horse-battery"), true);
  assert.equal(isPasswordWithinBcryptLimit("a".repeat(73)), false);
  assert.equal(isPasswordWithinBcryptLimit(123456789012), false);
  assert.equal(isPasswordWithinBcryptLimit("😀".repeat(18)), true);
  assert.equal(isPasswordWithinBcryptLimit("😀".repeat(19)), false);
});

test("token version accepts only the current account version", () => {
  assert.equal(isTokenVersionValid(0, 0), true);
  assert.equal(isTokenVersionValid(3, 3), true);
  assert.equal(isTokenVersionValid(2, 3), false);
  assert.equal(isTokenVersionValid(undefined, 0), false);
  assert.equal(isTokenVersionValid("3", 3), false);
});
