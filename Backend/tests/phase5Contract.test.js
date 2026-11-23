const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const backendRoot = path.resolve(__dirname, "..");
const frontendRoot = path.resolve(backendRoot, "..", "Frontend", "src");

function read(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("admin news create, read, update and delete routes exist and require admin authorization", () => {
  const routes = read(backendRoot, "routes/news.routes.js");
  for (const endpoint of [
    "/create-new-news",
    "/fetch-all-news",
    "/update-exist-news",
    "/update-specific-news-image",
    "/delete-specific-news",
  ]) {
    assert.ok(routes.includes(endpoint), `missing news endpoint ${endpoint}`);
  }

  assert.match(routes, /verify_token,\s*requireAdmin,\s*upload/);
  assert.match(routes, /verify_token,\s*requireAdmin,\s*\[/);
});

test("admin category mutation routes require admin authorization", () => {
  const routes = read(backendRoot, "routes/catagory.routes.js");
  assert.match(routes, /post\("\/create-new-category",\s*verifyToken,\s*requireAdmin/);
  assert.match(routes, /put\("\/edit-specfic-category",\s*verifyToken,\s*requireAdmin/);
  assert.match(routes, /delete\("\/delete-specific-category",\s*verifyToken,\s*requireAdmin/);
});

test("payment creation and verification require a user JWT and role", () => {
  const routes = read(backendRoot, "routes/subscription.routes.js");
  assert.match(routes, /create-new-order",\s*verifyToken,\s*requireUser/);
  assert.match(routes, /verify-payment",\s*verifyToken,\s*requireUser/);
  assert.match(routes, /get-my-token",\s*verifyToken,\s*requireUser/);

  const controller = read(backendRoot, "controller/subscription.controller.js");
  assert.match(controller, /razorpay\.orders\.fetch\(orderId\)/);
  assert.match(controller, /razorpay\.payments\.fetch\(paymentId\)/);
  assert.match(controller, /razorpayPayment\.status !== "captured"/);
  assert.match(controller, /session\.withTransaction/);
});

test("user OTP flows use distinct purposes", () => {
  const routes = read(backendRoot, "routes/user.routes.js");
  const controller = read(backendRoot, "controller/user.controller.js");
  assert.match(routes, /user_signup/);
  assert.match(routes, /user_password_reset/);
  assert.match(controller, /consumeOtp\(email, req\.body\.otp, "user_signup"\)/);
  assert.match(controller, /consumeOtp\(email, req\.body\.otp, "user_password_reset"\)/);
});

test("frontend exposes a create-news workflow using the backend multipart contract", () => {
  const page = read(frontendRoot, "pages/dashboard/News.jsx");
  const modal = read(frontendRoot, "pages/dashboard/NewsEditorModal.jsx");

  assert.match(page, /Create article/);
  assert.match(modal, /\/api\/news\/create-new-news/);
  assert.match(modal, /createBody\.append\("news-image", imageFile\)/);
  assert.match(modal, /createBody\.append\("content", JSON\.stringify\(cleanContent\)\)/);
});

test("frontend uses Bearer authorization through the shared API client", () => {
  const api = read(frontendRoot, "lib/api.js");
  assert.match(api, /Authorization", `Bearer \$\{token\}`/);
  assert.doesNotMatch(api, /headers\.set\("token"/);
});

test("paid-news endpoint only returns active articles after subscription lookup", () => {
  const controller = read(backendRoot, "controller/news.controller.js");
  assert.match(controller, /status: "Active"/);
  assert.match(controller, /token_id,\s*status: "Active",\s*subscription_end_date: \{ \$gt: new Date\(\) \}/);
});

test("frontend checkout does not claim success before server verification", () => {
  const checkout = read(frontendRoot, "pages/site/BuyNow.jsx");
  assert.match(checkout, /await requestSubscription\("verify-payment"/);
  assert.ok(checkout.indexOf('await requestSubscription("verify-payment"') < checkout.indexOf('setPhase("verified")'));
});
