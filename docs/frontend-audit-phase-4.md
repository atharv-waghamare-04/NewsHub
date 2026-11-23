# NewsHub Audit — Phase 4: Frontend security and integration

## Changes made

- Added a shared API client with a single API base URL, robust JSON/error parsing, and Bearer-token support.
- Migrated user authentication, admin authentication, subscription checkout, API-token retrieval, article/category management and article editing to the shared API client.
- Protected dashboard routes in the React router. This is a user-experience guard only; backend JWT authorization remains the security boundary.
- Changed dashboard requests to use `Authorization: Bearer <token>`, which is allowed by the backend CORS configuration and recognized by the Phase 3 token middleware.
- Updated the dashboard logout to remove only the administrator token instead of clearing all browser session storage.
- Removed non-existent Analytics and Settings links from the dashboard navigation.
- Removed the public administrator sign-up UI because the backend intentionally disables public administrator registration.
- Aligned user/admin password input constraints with the backend's 12–72 UTF-8-byte bcrypt policy.
- Aligned article image uploads with backend restrictions: JPEG, PNG or WebP, maximum 5 MB.
- Fixed the news-image URL helper to use the configured API base or same-origin fallback.
- Removed the Razorpay script element from inside the React Router tree; checkout already loads Razorpay on demand.
- Added `Frontend/.env.example` with the API URL and public Razorpay key configuration.

## Important security limitations

- Browser route guards do not secure APIs. The backend must continue validating every token and role.
- `sessionStorage` is still accessible to JavaScript and therefore exposed if an XSS vulnerability executes. This phase does not claim to eliminate XSS or token theft.
- The frontend currently uses the existing sessionStorage token architecture. A secure HttpOnly-cookie migration requires coordinated backend CORS, CSRF, cookie and deployment changes.
- API URL fallback to `window.location.origin` is useful for same-origin deployments. For local development where Vite and Express run on different ports, set `VITE_API_URL=http://localhost:5000`.
- The API guide's code sample intentionally demonstrates the public paid-news endpoint and subscription token body; the token must be kept private.

## Validation status

- Source-level checks and targeted static searches were performed.
- Frontend dependency installation/build/lint and browser end-to-end tests were not run in this environment because frontend dependencies are not installed.
- Payment checkout still requires live Razorpay test-mode verification, and all backend integration tests remain necessary before production deployment.
