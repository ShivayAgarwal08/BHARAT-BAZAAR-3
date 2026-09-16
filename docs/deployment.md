# Deployment

Deploy the API before the frontend.

## Render API

Create a Render Web Service from the repository root. Use Node, `npm ci && npm run build` as the build command, `npm run start` as the start command, and `/api/health` as the health check. The checked-in `render.yaml` contains the same safe settings.

Set only these environment-variable names in Render: `NODE_ENV`, `PORT`, `CLIENT_URL` or `CLIENT_URLS`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Use the pooled Neon URL for runtime traffic and the unpooled URL only for migrations. Never paste values into Git.

After Render provides the HTTPS API URL, set `CLIENT_URL` to the future Vercel origin (or use `CLIENT_URLS` for a comma-separated set of exact origins). Confirm `GET /api/health` returns the health JSON.

## Vercel frontend

Import the same repository and keep its root directory at the repository root. The committed `vercel.json` runs `npm run build --workspace client`, writes `client/dist`, and rewrites SPA routes to `index.html`. Vercel installs from the root lockfile; do not create a second lockfile.

Set `VITE_API_BASE_URL` to the Render URL plus `/api/v1`. The committed `vercel.json` provides SPA rewrites so dashboard links refresh correctly. Redeploy after changing the variable, then add the final Vercel URL to Render `CLIENT_URL`/`CLIENT_URLS`.

## MVP limitations

Payments remain external to Bharat Bazaar. Payment proofs are private PostgreSQL data for this MVP and should move to private object storage before large-scale production use. Browser tokens use localStorage and need a hardened session strategy before production.
