# NewsHub

NewsHub is a full-stack news publishing and subscription platform. It includes a public news experience, an administrator dashboard, category and article management, user accounts, annual subscription checkout, and a paid-news API.

> **Deployment status:** The current deployment uses a React/Vite frontend on Vercel, an Express backend on Render, MongoDB Atlas for data storage, and Google Apps Script (`MailApp`) for OTP email delivery. Email delivery is made from the backend to Google Apps Script over HTTPS; the backend does not need an outbound SMTP connection. Verify the live Render logs and complete the production checks below before treating the deployment as production-ready.

## Features

- Public news website and account registration/login.
- Email OTP verification for registration and password recovery.
- OTP email delivery through Google Apps Script and Gmail (`MailApp`) over HTTPS.
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
Frontend (React + Vite, Vercel)
        |
        | HTTPS / JSON / multipart / Bearer JWT
        v
Backend (Express, Render)
  |          |                    |
  |          |                    +---- Razorpay API
  |          +------------------------- Google Apps Script Web App
  |                                      |
  |                                      +---- Gmail / MailApp
  +------------------------------------- MongoDB Atlas
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
│   │   └── googleMail.js
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

- Node.js 22.22.0 or newer (use a compatible Node.js version for both local development and deployment).
- npm.
- MongoDB Atlas or a MongoDB replica set for subscription transaction support.
- A Google account that can authorize a Google Apps Script web app to send email.
- Razorpay test credentials for payment testing.
- GitHub account for the Render and Vercel deployment workflow.

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
| `PORT` | Local API port, usually `5000`; Render supplies its own port in deployment. |
| `MONGO_DB_URL` | MongoDB connection string. |
| `JWT_SECRET` | Random secret, at least 32 bytes. |
| `OTP_SECRET` | Different random secret, at least 32 bytes. |
| `JWT_EXPIRES_IN` | JWT lifetime, e.g. `1h`. |
| `CORS_ORIGINS` | Exact frontend origin(s), comma-separated; do not add trailing slashes. |
| `MAIL_API_URL` | Deployed Google Apps Script Web App URL ending in `/exec`. |
| `MAIL_SECRET` | Shared secret that must match the `MAIL_SECRET` Script Property in Apps Script. |
| `RAZORPAY_ID` | Server-side Razorpay key ID. |
| `RAZORPAY_SECRET` | Server-side Razorpay secret. |
| `SUBSCRIPTION_PRICE` | Annual price in INR. |

Do not add SMTP host, port, Gmail password, App Password, or Resend API-key settings for this email implementation. The backend calls Google Apps Script over HTTPS; Gmail credentials and authorization remain in the Google account that owns the Apps Script deployment.

Generate independent application secrets with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Use a separate random value for `JWT_SECRET`, `OTP_SECRET`, and `MAIL_SECRET`. Configure the same `MAIL_SECRET` value in the Apps Script project's Script Properties and in the backend environment. Never expose it in the frontend.

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

### 2. Google Apps Script email delivery

The backend's `services/googleMail.js` sends an HTTPS POST request to a Google Apps Script Web App. The Apps Script should validate the shared token and send the message using `MailApp.sendEmail()`.

1. Open [Google Apps Script](https://script.google.com/) and create or open the NewsHub mail project.
2. Add a `MAIL_SECRET` Script Property under **Project Settings → Script Properties**. Use the same secret configured as `MAIL_SECRET` in the backend environment.
3. Ensure the web app's `doPost(e)` handler parses the JSON request, validates the shared token, validates the recipient and message fields, checks the available daily recipient quota, and sends with `MailApp.sendEmail()`.
4. Choose **Deploy → New deployment → Web app**.
5. Set **Execute as** to the account that owns the script. Set access to **Anyone** if that option is available and permitted by the account or Workspace administrator.
6. Authorize the requested email-sending permission and copy the deployed Web App URL ending in `/exec`.
7. Set that URL as `MAIL_API_URL` in the backend environment. Set the matching shared secret as `MAIL_SECRET`.

If the Apps Script code changes, deploy a new version of the web app (or update the existing deployment to the new version). Confirm the deployment URL and script property still match the backend configuration.

**Quota and suitability:** Google Apps Script email quotas are account-dependent and can change. Consumer accounts commonly have a daily recipient limit (currently documented by Google as 100 recipients per day); Workspace quotas may differ. This approach is suitable for development, demonstrations, and low-volume use, but it is not a high-volume transactional email service. A successful Apps Script response means the send operation was accepted by the script; it does not guarantee inbox placement. Check spam folders and Apps Script execution logs when diagnosing delivery problems.

### 3. Frontend

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

Only the public Razorpay key ID belongs in frontend variables. Never put `RAZORPAY_SECRET`, `MAIL_SECRET`, `MAIL_API_URL` credentials, MongoDB credentials, or other backend secrets in the frontend.

Start the Vite development server:

```bash
npm run dev
```

## Deployment

### Frontend on Vercel

1. Import the frontend repository/project into [Vercel](https://vercel.com/).
2. Set the project root directory to `Frontend` if the frontend is in that subfolder.
3. Configure the build command and output directory according to the frontend's Vite configuration (normally `npm run build` and `dist`).
4. Add the environment variable `VITE_API_URL` with the public Render backend URL, for example:

   ```env
   VITE_API_URL=https://your-backend-name.onrender.com
   ```

5. Add the public Razorpay key ID and checkout flag if required by the frontend.
6. Redeploy after changing Vercel environment variables; Vite variables are embedded at build time.

### Backend on Render

1. Create a Render **Web Service** connected to the backend GitHub repository/branch.
2. Set the root directory to `Backend` if the backend is in a subfolder; otherwise leave it at the repository root.
3. Use `npm install` (or `npm ci` when the lockfile is present and in sync) as the build command.
4. Use `node index.js` as the start command, unless the backend package defines a different production start script.
5. Configure the backend environment variables listed above in Render's Environment settings.
6. Set `CORS_ORIGINS` to the exact deployed Vercel origin, for example:

   ```env
   CORS_ORIGINS=https://your-project.vercel.app
   ```

   Do not include a trailing slash. If more than one frontend origin is intentionally supported, use the comma-separated format expected by the backend's CORS configuration.
7. Ensure the Express server listens on `process.env.PORT` and binds to `0.0.0.0`.
8. Confirm the MongoDB Atlas Network Access rules allow the Render service to connect. Render's outbound IPs may not be fixed on all plans; do not whitelist a guessed Render IP. If using `0.0.0.0/0` temporarily for connectivity testing, use strong database credentials and understand that it allows connection attempts from any IP; restrict network access when a suitable stable networking option is available.
9. Deploy and inspect the latest Render logs. A successful startup should show that MongoDB connected and the API is listening on the assigned port.

Render's free web services can spin down after inactivity and may take time to respond to the first request after waking. A 503 can also indicate that the service is not healthy or has crashed; always inspect the latest service logs rather than assuming every 503 is a cold start.

### CORS and API checks

- The Vercel origin in `CORS_ORIGINS` must exactly match the browser's origin, including `https://` and the hostname, with no trailing slash.
- CORS middleware must be registered before API routers and must handle browser `OPTIONS` preflight requests.
- The user OTP route is `POST /api/user/generate-otp-for-admin`; it accepts `email` and a `purpose` of `user_signup` or `user_password_reset`.
- The root URL `/` or `/health` is only available if the corresponding route has been added to `index.js`. Do not treat a `Cannot GET /` response as proof that the API service is down; inspect the actual API routes and Render logs.
- If the browser reports `ERR_BLOCKED_BY_CLIENT`, temporarily test with browser extensions disabled or in a clean browser profile. This is distinct from a server-side CORS response.

## Automated tests

Backend unit and security tests:

```bash
cd Backend
npm test
```

Phase 5 route/UI contract tests (if the script is present in the backend `package.json`):

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
| `POST` | `/api/user/generate-otp-for-admin` | Public, rate-limited; signup/password-reset OTP request |
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
- The Apps Script Web App URL is an endpoint, not a secret. Protect it with the shared `MAIL_SECRET`, validate inputs, and apply rate limiting/abuse controls to the backend OTP routes.
- Keep `MAIL_SECRET` in backend environment variables and Apps Script Script Properties only. Never expose it through Vite variables or commit it to Git.
- Do not commit `.env` files, credentials, local uploaded images, customer data or payment secrets.

## Audit documentation

- [`docs/backend-audit-phase-3.md`](docs/backend-audit-phase-3.md)
- [`docs/frontend-audit-phase-4.md`](docs/frontend-audit-phase-4.md)
- [`docs/phase-5-testing-and-release.md`](docs/phase-5-testing-and-release.md)

## Before production

Complete the live integration checklist with staging MongoDB and Razorpay test credentials. Verify Google Apps Script authorization, deployment access, recipient quota, email delivery and failure handling. Run frontend lint/build, scan dependencies and secrets, verify CORS/HTTPS, and test payment webhooks/reconciliation before enabling live checkout. Because the current Apps Script approach has relatively low daily quotas and account-dependent restrictions, move to a dedicated transactional email provider before expecting substantial public signup volume.
