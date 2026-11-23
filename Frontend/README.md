# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Local setup

1. Use Node.js `22.22.0` or newer (`.nvmrc` is provided).
2. Copy `.env.example` to `.env`.
3. Keep `VITE_API_URL=http://localhost:5000` when the backend runs on port 5000.
4. Set `VITE_RAZORPAY_KEY_ID` to the public Razorpay key ID only. Never put the Razorpay secret in frontend variables.
5. Install and run:

```bash
npm ci
npm run dev
```

For production, set `VITE_API_URL` to the public HTTPS API origin and configure the matching backend `CORS_ORIGINS`.

