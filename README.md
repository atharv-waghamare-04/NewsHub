# NewsHub

NewsHub is a full-stack news publishing and subscription platform. It includes a public news experience, an administrator dashboard, category and article management, user accounts, annual subscription checkout, and a paid-news API.

> **Project status:** Security and functional audit patches have been applied through Phase 5. Automated source/unit/contract checks pass in the audit workspace. Live MongoDB, SMTP, browser, Razorpay test-mode, and production deployment checks remain to be completed using your own staging credentials.

## Features

- Public news website and account registration/login.
- Email OTP verification for registration and password recovery.
- Administrator dashboard with category management.
- Article creation, editing, publication status, image upload and deletion.
- JPEG, PNG and WebP upload validation, including file-signature checks and a 5 MB limit.
- Role-protected administrator and subscriber endpoints.
- JWT authentication with account/token-version checks and password-reset session invalidation.
- Purpose-specific, hashed, expiring, one-time OTPs.
- Annual Razorpay subscription checkout with server-side signature and payment-status verification.
- Subscription token endpoint and paid-news API.
- Rate limits for sensitive authentication and payment operations.

## Architecture

```text
Frontend (React + Vite)
        |
        | HTTPS / JSON / multipart / Bearer JWT
        v
Backend (Express)
  |       |          |
  |       |          +---- Razorpay API
  |       +--------------- SMTP provider
  +----------------------- MongoDB
```

### Main folders

```text
NewsHub/
├── Backend/
│   ├── controller/
│   ├── db/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   └── tests/
├── Frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── lib/
│       └── pages/
└── docs/
```

## Requirements

- Node.js 22.22.0 or newer for the frontend.
- npm.
- MongoDB Atlas or a MongoDB replica set for subscription transaction support.
- SMTP credentials for email OTP delivery.
- Razorpay test credentials for payment testing.

## Local setup

### 1. Backend

```bash
cd Backend
npm ci
cp .env.example .env
```

Set the values in `Backend/.env`:

| Variable | Purpose |
|---|---|
| `PORT` | API port, usually `5000` |
| `MONGO_DB_URL` | MongoDB connection string |
| `JWT_SECRET` | Random secret, at least 32 bytes |
| `OTP_SECRET` | Different random secret, at least 32 bytes |
| `JWT_EXPIRES_IN` | JWT lifetime, e.g. `1h` |
| `CORS_ORIGINS` | Exact frontend origin(s), comma-separated |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_APP_PASSWORD` | OTP email delivery |
| `RAZORPAY_ID` | Server-side Razorpay key ID |
| `RAZORPAY_SECRET` | Server-side Razorpay secret |
| `SUBSCRIPTION_PRICE` | Annual price in INR |

Generate independent secrets with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Run the migrations after backing up the database:

```bash
npm run migrate:auth-security
npm run migrate:payment-ledger
```

The authentication migration deletes old OTP records because they were not purpose-scoped. Users must request fresh OTPs after migration.

Provision the first administrator through the trusted CLI script. Temporarily set the four `BOOTSTRAP_ADMIN_*` values in `.env`, then run:

```bash
npm run create-admin
```

Remove the bootstrap values from `.env` after successful provisioning.

Start the API:

```bash
npm run dev
```

### 2. Frontend

Use Node.js 22.22.0 or newer:

```bash
cd Frontend
cp .env.example .env
npm ci
```

Set:

```env
VITE_API_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=rzp_test_your_public_key_id
VITE_ENABLE_LIVE_CHECKOUT=false
```

Only the public Razorpay key ID belongs in frontend variables. Never put `RAZORPAY_SECRET` in the frontend.

Start the Vite development server:

```bash
npm run dev
```

## Automated tests

Backend unit and security tests:

```bash
cd Backend
npm test
```

Phase 5 route/UI contract tests:

```bash
npm run test:phase5
```

Frontend lint and production build:

```bash
cd Frontend
npm run lint
npm run build
```

The Phase 5 integration checklist is in [`docs/phase-5-testing-and-release.md`](docs/phase-5-testing-and-release.md).

## Important API routes

| Method | Endpoint | Access |
|---|---|---|
| `POST` | `/api/user/generate-otp-for-admin` | Public, rate-limited |
| `POST` | `/api/user/create-new-user` | Public, OTP required |
| `POST` | `/api/user/login-admin` | Public, rate-limited |
| `POST` | `/api/user/forget-password` | Public, OTP required |
| `POST` | `/api/admin/login-admin` | Public, rate-limited |
| `POST` | `/api/category/create-new-category` | Admin |
| `GET` | `/api/category/fetch-all-categories` | Public |
| `POST` | `/api/news/create-new-news` | Admin, multipart |
| `POST` | `/api/news/fetch-all-news` | Admin |
| `PUT` | `/api/news/update-exist-news` | Admin |
| `PUT` | `/api/news/update-specific-news-image` | Admin, multipart |
| `DELETE` | `/api/news/delete-specific-news` | Admin |
| `POST` | `/api/subscription/create-new-order` | Authenticated user |
| `POST` | `/api/subscription/verify-payment` | Authenticated user |
| `POST` | `/api/subscription/get-my-token` | Authenticated subscriber |
| `POST` | `/api/news/fetch-all-paid-news` | Active subscription token |

The historical endpoint names `login-admin` and `generate-otp-for-admin` are retained for compatibility even in the user routes.

## Security notes

- All protected backend routes must verify JWTs and roles. Frontend route guards are not a security boundary.
- JWTs are currently stored in `sessionStorage`; an XSS flaw could expose them. A future hardening phase should consider HttpOnly cookies and CSRF protection.
- Rate limiting currently uses the default in-memory store. Use a shared store such as Redis when deploying multiple API instances.
- Payment verification checks the local order owner, Razorpay signature, order details, captured payment status and transaction ledger before activating a subscription.
- Payment activation uses MongoDB transactions; use Atlas, a replica set, or a sharded cluster.
- Do not commit `.env` files, credentials, local uploaded images, customer data or payment secrets.

## Audit documentation

- [`docs/backend-audit-phase-3.md`](docs/backend-audit-phase-3.md)
- [`docs/frontend-audit-phase-4.md`](docs/frontend-audit-phase-4.md)
- [`docs/phase-5-testing-and-release.md`](docs/phase-5-testing-and-release.md)

## Before production

Complete the live integration checklist with staging MongoDB, SMTP and Razorpay test credentials. Run the frontend lint/build on the required Node version, scan dependencies and secrets, verify CORS/HTTPS, and test payment webhooks/reconciliation before enabling live checkout.
