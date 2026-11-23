# NewsHub Backend Audit — Phase 1

Audit scope: static review of the uploaded backend source and first-pass remediation.

## Patched in this phase

- Replaced non-standard `express().router` construction with `express.Router()` in category and subscription routers.
- Corrected category controller validation to use `validationResult(req).isEmpty()`.
- Added duplicate category handling and protected category deletion when articles still reference it.
- Preserved the existing category collection name `nh_category_details`.
- Added upload allow-listing for JPEG, PNG and WebP, a 5 MB limit, one-file limit, field/part limits, random server-side filenames, and file-signature checks.
- Added cleanup for invalid multipart JSON and image files.
- Added an image upload middleware to both create-news and update-news-image routes.
- Restricted paid news retrieval to active, unexpired subscriptions and active news articles.
- Added an administrator login rate limiter and tighter OTP request limiting.
- Excluded password hashes from ordinary Mongoose query results; login queries explicitly select the password hash.
- Bounded login history to the latest 50 entries.
- Made upload/static paths independent of the process working directory.
- Removed literal test credentials from `Backend/backend.http` and corrected the local image path.
- Added focused Node.js tests for uploaded-image signature validation.

## Verification performed

- `node --check` passed for all backend JavaScript files after the first patch.
- `npm audit` could not reach the npm registry in this environment (`EAI_AGAIN`); dependency vulnerability status is therefore **not verified**.
- Dependencies are not installed in the extracted project, so route loading, integration tests, database behavior and payment-provider calls have not yet been run.
- The image middleware tests are included but have not been executed in this environment yet.

## High-priority work still outstanding

1. Payment idempotency and payment-history design: the current subscription document stores only one payment/order ID. Renewal overwrites those IDs, so old payment replay protection is incomplete. Add a separate immutable payment ledger and a migration plan before production use.
2. Verify Razorpay order creation/verification end-to-end using test-mode credentials and a test account.
3. Add subscription lifecycle handling (expiry, cancellation/refund policy, webhook reconciliation) if those behaviors are part of the product.
4. Review OTP generation/consumption concurrency, reset-password throttling, and email-provider failure handling.
5. Add full API integration tests against an isolated test database.
6. Review CORS, proxy trust, deployment headers, secrets rotation, logging and production environment configuration.
7. Run `npm ci`, `npm audit`, frontend checks and end-to-end tests in an environment with registry access.

This phase is a remediation pass, not a certification or claim that the application is production-secure.
