function isPasswordWithinBcryptLimit(password) {
  if (typeof password !== "string") return false;
  const byteLength = Buffer.byteLength(password, "utf8");
  return byteLength >= 12 && byteLength <= 72;
}

function isTokenVersionValid(tokenVersion, storedVersion) {
  return Number.isInteger(tokenVersion) &&
    tokenVersion === Number(storedVersion || 0);
}

module.exports = {
  isPasswordWithinBcryptLimit,
  isTokenVersionValid,
};
