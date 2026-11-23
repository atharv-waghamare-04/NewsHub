# NewsHub Backend Audit — Phase 2: Payments

## Scope

This phase hardens Razorpay order creation and payment verification, separates the payment ledger from the current subscription entitlement, and makes entitlement activation atomic.

## Changes

### 1. Payment transaction ledger

Added `models/paymentTransaction.model.js`. It stores one record per Razorpay order, including:
- authenticated user ID;
- unique Razorpay order ID;
- unique sparse Razorpay payment ID;
- amount in paise and currency;
- plan and receipt;
- lifecycle status (`created` or `applied`);
- capture and activation timestamps.

This ledger is separate from `nh_subscription_details`, which continues to represent the user's current entitlement.

### 2. Order ownership

A Razorpay order is recorded locally before its details are returned to the client. Verification requires a matching local order belonging to the authenticated user. The server also checks the Razorpay order notes, amount, currency, payment ID, capture state and order state using Razorpay's API.

### 3. Signature verification

Checkout signatures are verified with HMAC-SHA256 and `crypto.timingSafeEqual`. Signature handling was extracted to `services/paymentSecurity.js` and covered by unit tests.

### 4. Atomic and idempotent activation

The payment ledger update and subscription entitlement update run in one MongoDB transaction. A repeated verification of an already-applied order returns an idempotent success response without extending the subscription a second time. Unique order/payment indexes protect against reuse and concurrent duplicate requests.

**Database requirement:** MongoDB multi-document transactions require a replica set or sharded cluster. MongoDB Atlas supports this. A standalone local `mongod` does not. If transactions are unavailable, the API deliberately refuses to activate the subscription and returns `503 TRANSACTIONS_UNAVAILABLE`.

### 5. Amount integrity

The subscription's recorded amount is derived from the amount stored against the original local order, not from the current environment price. A price change between order creation and verification therefore cannot rewrite the amount that was actually paid.

### 6. Rate limiting

Subscription order creation and payment verification are rate-limited.

## Existing database migration

The legacy subscription document stored only the latest order/payment IDs. The migration script copies the payment currently retained on each subscription into the new ledger:

```bash
npm run migrate:payment-ledger
```

Before running:
1. Back up the MongoDB database.
2. Configure `MONGO_DB_URL` for the intended database.
3. Deploy the new model and controller.
4. Run the migration once, then inspect the reported migrated/skipped counts.
5. Do not delete or modify the old subscription fields during this migration.

**Historical limitation:** Previous renewal IDs that were overwritten by the old implementation cannot be reconstructed from the current subscription documents. The migration can preserve only the latest payment still present in each legacy document.

## Verification

- All 32 backend JavaScript files passed `node --check`.
- Seven Node built-in tests passed, covering upload-signature validation and checkout HMAC verification.
- Live Razorpay calls, MongoDB transaction execution, payment race tests and end-to-end subscription activation have not been run in this environment.

## Not yet claimed as complete

This phase does not implement Razorpay webhooks, refunds, chargebacks, cancellations, proration, or an admin payment-history UI. A webhook reconciliation endpoint and provider-side event idempotency should be added before relying on asynchronous payment state changes in production.

## Operational safety

- Use Razorpay test-mode credentials for test runs.
- Never place `RAZORPAY_SECRET` in frontend code or client-visible API responses.
- Keep database backups before running migrations.
- Verify that the deployed MongoDB topology supports transactions.
- Run dependency vulnerability checks in an environment with npm registry access.
