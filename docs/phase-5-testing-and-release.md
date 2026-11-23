# NewsHub Phase 5 — Application testing and release readiness

## Scope completed in this phase

- Reviewed frontend/backend endpoint contracts for user authentication, admin authentication, categories, news management, subscriptions and paid-news API access.
- Added the missing administrator **Create article** workflow to the dashboard.
- Connected article creation to `POST /api/news/create-new-news` using the backend's multipart contract:
  - `title`
  - `description`
  - `author`
  - `category_name`
  - `content` as a JSON string
  - `news-image` as a JPEG, PNG or WebP file
- Enforced a required featured image in create mode and retained optional image replacement in edit mode.
- Added dependency-free Phase 5 contract tests to check important route protections and frontend/backend endpoint agreement.
- Added a repeatable manual integration checklist below.

## Automated checks run in this workspace

| Check | Result |
|---|---:|
| Backend JavaScript syntax checks | 0 errors |
| Frontend JS/JSX transpile parsing | 18 files, 0 errors |
| Frontend local import checks | 0 missing imports |
| Backend `npm test` | 20 passed, 0 failed |
| Backend `npm run test:phase5` | 8 passed, 0 failed |
| Static search for `dangerouslySetInnerHTML` | None found |
| Static search for direct `.innerHTML` | None found |
| Static search for custom token headers in app requests | None found |

These are source, unit and contract checks. They are not proof that the live database, SMTP provider, browser, or payment provider is working.

## Environment limitations

The workspace does not contain installed project dependencies, a MongoDB connection, SMTP credentials, or Razorpay test credentials.

An offline `npm ci` was attempted for both projects and could not complete because required packages were not present in the local npm cache. The installed Node version in this workspace is `22.16.0`; the frontend requires Node `22.22.0` or newer. Therefore:

- The Vite production build has not been verified here.
- ESLint has not been run.
- MongoDB/SMTP/browser integration tests have not been run.
- Razorpay test-mode payment has not been run.
- Production deployment has not been run.

Do not describe the repository as fully end-to-end tested until the steps below have been completed in a configured local or staging environment.

## Run automated checks locally

Backend:

```bash
cd Backend
npm ci
npm test
npm run test:phase5
```

Frontend (Node.js 22.22.0 or newer):

```bash
cd Frontend
npm ci
npm run lint
npm run build
```

## Manual integration checklist

Use a staging database and Razorpay test credentials. Do not use real customer data or live payment credentials.

### A. Startup and configuration

- [ ] Set all required backend environment variables from `Backend/.env.example`.
- [ ] Set `MONGO_DB_URL` to a MongoDB Atlas deployment or replica set; subscription activation uses transactions.
- [ ] Set `JWT_SECRET` and `OTP_SECRET` to different randomly generated secrets of at least 32 bytes.
- [ ] Configure SMTP credentials and verify that test emails arrive.
- [ ] Set `CORS_ORIGINS` to the exact frontend origin.
- [ ] Run `npm run migrate:auth-security` once after backing up the database.
- [ ] Run `npm run migrate:payment-ledger` if deploying the payment ledger for the first time.
- [ ] Start the backend and frontend; confirm no startup or browser-console errors.

### B. User authentication

- [ ] Request a `user_signup` OTP for an unregistered email.
- [ ] Confirm the code arrives and the resend cooldown is enforced.
- [ ] Register with a valid code and a 12–72 UTF-8-byte password.
- [ ] Confirm the same OTP cannot be used a second time.
- [ ] Sign in with the new user.
- [ ] Confirm a wrong password returns a generic authentication error.
- [ ] Request a `user_password_reset` OTP for the registered user.
- [ ] Reset the password and confirm the old password no longer works.
- [ ] Confirm an already-issued JWT is rejected after password reset.
- [ ] Confirm an admin-reset OTP cannot be used in a user flow.

### C. Administrator authentication

- [ ] Provision an administrator only with `npm run create-admin`.
- [ ] Confirm the public `/api/admin/create-new-admin` endpoint returns 403.
- [ ] Sign in through `/dashboard/signin`.
- [ ] Confirm the admin can open dashboard pages.
- [ ] Confirm a user JWT cannot access category/news mutation endpoints.
- [ ] Confirm an expired or revoked admin JWT redirects the dashboard to sign-in.
- [ ] Test admin password reset and confirm the previous admin JWT is rejected.

### D. Categories

- [ ] Create a category as administrator.
- [ ] Confirm it appears in the category list and news editor.
- [ ] Try to create the same category with different letter casing; it should be rejected.
- [ ] Rename a category and verify the change.
- [ ] Attempt to delete a category assigned to articles; expect HTTP 409.
- [ ] Delete an unused category; confirm it disappears.
- [ ] Confirm unauthenticated and non-admin create/edit/delete requests are rejected.

### E. News management

- [ ] Open Dashboard → Articles.
- [ ] Create an article with all required fields and a JPEG, PNG or WebP image.
- [ ] Confirm the new article appears in the list and its image loads.
- [ ] Try a missing image, oversized image, and a text file renamed as `.jpg`; each must be rejected.
- [ ] Edit the article text, category, content sections and status.
- [ ] Replace its image and confirm the old image is removed after a successful update.
- [ ] Filter by category and search term.
- [ ] Confirm inactive articles are not returned by the paid-news endpoint.
- [ ] Delete a test article and confirm its uploaded image is removed.
- [ ] Confirm user JWTs cannot create, edit or delete news.

### F. Subscription and Razorpay test mode

- [ ] Sign in as a user without an active subscription.
- [ ] Create an order and verify the amount/currency are the server-configured INR amount.
- [ ] Complete a Razorpay test payment.
- [ ] Confirm the browser callback alone does not activate a subscription.
- [ ] Confirm the backend verifies the signature and fetches the order/payment from Razorpay.
- [ ] Confirm only a captured payment activates the subscription.
- [ ] Retry verification with the same payment and confirm it is idempotent.
- [ ] Attempt to verify another user's order; expect rejection.
- [ ] Attempt to reuse a payment ID; expect rejection.
- [ ] Confirm an active subscriber cannot create a second order.
- [ ] Confirm subscription end date is one year from the correct start/previous expiry date.
- [ ] Confirm the API token is available only to the authenticated subscribed user.
- [ ] Confirm transaction support is enabled on the MongoDB deployment.

### G. Paid-news API

- [ ] Obtain the user's subscription token through the authenticated token endpoint.
- [ ] Call `POST /api/news/fetch-all-paid-news` with a valid token.
- [ ] Confirm only active articles are returned.
- [ ] Test an invalid, expired, missing and altered token.
- [ ] Confirm pagination and category/search filters.
- [ ] Confirm the endpoint never returns inactive articles.

### H. Release hygiene

- [ ] Confirm `.env`, local uploads, credentials, private keys and test payment data are not committed.
- [ ] Review `git status` and `git diff`.
- [ ] Run secret scanning and dependency vulnerability scanning.
- [ ] Add screenshots of the homepage, admin dashboard, article editor and membership page.
- [ ] Add a README describing architecture, setup, environment variables, migrations, API endpoints and tests.
- [ ] Deploy to staging and repeat the critical user journeys before production.

## Known remaining concerns

- JWTs remain in `sessionStorage`; a successful XSS attack could expose them. Consider a carefully designed HttpOnly-cookie and CSRF-protected session architecture in a future phase.
- The current rate-limit store is in-memory. Use a shared store such as Redis for multiple backend instances.
- Category uniqueness is currently enforced by an ordinary MongoDB unique index, while the controller checks names case-insensitively. For strict case-insensitive uniqueness under concurrent writes, migrate to a normalized `name_key` field with a unique index.
- Payment activation depends on MongoDB transactions and must be tested on the actual deployment topology.
- A production deployment should add payment webhooks and a reconciliation process for payments captured by Razorpay when the browser closes before verification finishes.
