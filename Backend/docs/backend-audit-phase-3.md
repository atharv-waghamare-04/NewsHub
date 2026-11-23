# NewsHub Backend Audit — Phase 3: Authentication

## Changes in this phase

- Added `tokenVersion` to administrator and user records.
- New JWTs carry a `ver` claim; protected requests now verify the JWT signature, issuer, audience, expiry, role, account existence, and current token version.
- Password resets increment `tokenVersion`, invalidating all previously issued JWTs for that account.
- OTPs are now scoped to `user_signup`, `user_password_reset`, or `admin_password_reset`.
- OTP issuance uses a conditional upsert and a unique `(email, purpose)` index to enforce a single active code per flow and a 60-second resend cooldown.
- OTPs are consumed atomically with `findOneAndDelete`; concurrent requests cannot successfully consume the same OTP twice.
- Incorrect OTP attempts are incremented atomically and capped at five.
- OTP values remain HMAC digests in MongoDB, and the configured OTP secret must be at least 32 bytes.
- If SMTP delivery fails, the newly written OTP record is deleted.
- Admin login, admin OTP, admin password reset, user login, user OTP, user password reset, and user registration have route-level rate limits.
- Password creation/reset now requires 12–72 UTF-8 bytes to stay within bcrypt's 72-byte input limit.
- Passwords longer than 72 bytes are rejected at login to avoid bcrypt truncation ambiguity.
- User signup and user password reset use different OTP purposes; administrator reset codes cannot be used in user flows.
- Admin account creation remains disabled through the public API and must use the trusted bootstrap script.
- The user authentication screen now sends the correct OTP purpose and displays the 10-minute expiry.

## Required migration

Before deploying these changes, back up MongoDB and run:

```bash
npm run migrate:auth-security
```

The migration invalidates all existing OTP records because the old records did not identify their purpose. Users must request fresh codes. It also creates the unique compound index `(email, purpose)` and ensures the OTP TTL index exists.

Existing accounts without `tokenVersion` are treated as version `0`. Previously issued JWTs do not contain the new `ver` claim and will be rejected; users and administrators must sign in again after deployment.

## Operational notes

- Rate limiting uses the default in-memory store. For multiple backend instances, configure a shared store such as Redis; otherwise each instance maintains separate counters.
- Use HTTPS in production. Session tokens are still stored by the existing frontend in `sessionStorage`; XSS can expose them. A later frontend security phase should assess migration to secure, HttpOnly cookies or a carefully designed alternative.
- The protected-route middleware now queries MongoDB for account existence and token version on each authenticated request. This improves revocation but adds one indexed database lookup per protected request.
- Email delivery, OTP issuance, and password updates are not a single distributed transaction. Failed email sends remove the pending OTP; after a successfully consumed OTP, an unexpected database failure may require the user to request a new code.
- This phase has not been live-tested against SMTP, MongoDB, or the browser. Run the integration checklist before production deployment.
