

## Phase 2 — Authentication and OTP hardening

- Disabled public administrator creation. Provision the first administrator with `Backend/scripts/createAdmin.js`.
- OTP values are generated with `crypto.randomInt`, stored as HMAC digests, expire after 10 minutes, allow at most five attempts, and are deleted after successful use.
- Added per-IP OTP request limiting and a per-email 60-second resend cooldown.
- User and admin login use asynchronous bcrypt comparison and issue HS256 JWTs with a configurable expiry, issuer, and audience.
- Authentication middleware accepts Bearer tokens and the legacy `token` header, rejects expired and non-expiring legacy tokens, and returns 401 for authentication failures.
- Validation errors are checked with `validationResult(req).isEmpty()`.
- Added first-admin bootstrap script and `OTP_SECRET`, `JWT_EXPIRES_IN`, and temporary `BOOTSTRAP_ADMIN_*` environment settings.

**Compatibility note:** Existing sessions will need users to sign in again because new tokens require an expiry, issuer, and audience. The admin registration UI/API is intentionally disabled; create the first administrator from the backend command line instead.

- Added role-based authorization: NewsHub news-management endpoints require an admin token; subscription endpoints require a user token.
- OTP verification ignores legacy plaintext OTP records from the previous schema; request a fresh OTP after deploying Phase 2.


## Phase 3 — Razorpay payment verification hardening

- Razorpay order creation uses the authenticated user ID in server-created order notes and derives the amount only from `SUBSCRIPTION_PRICE`.
- Payment verification checks the checkout HMAC signature using a timing-safe comparison.
- The backend fetches the order and payment directly from Razorpay and verifies order ownership, plan, amount, currency, order status, payment/order linkage, captured status and captured flag.
- Payment/order IDs are unique in the subscription model; repeat verification is handled idempotently.
- Subscription access tokens and stored signatures are excluded from normal Mongoose query results.
- Subscription token lookup only returns a currently active, unexpired subscription.
- Renewal extends from the current expiry date where appropriate.
**Operational note:** The first deployment after this change may need MongoDB unique indexes to be built. Resolve any existing duplicate payment/order/user records before index creation. Test with Razorpay test keys before enabling live checkout.
