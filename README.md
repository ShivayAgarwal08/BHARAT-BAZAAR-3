# Bharat Bazaar

Artisans create. Students grow. We connect.

Bharat Bazaar is a multilingual managed growth platform connecting local artisans with college Student Growth Managers. The platform stays involved in verification and, in later phases, matching, agreements and progress.

## Current status: Phase 4

Implemented: real accounts, Bearer JWT authentication, server-side role authorization, artisan and student onboarding, skill selection, assisted-registration requests, admin student verification, and real admin counts. Public Phase 1 pages and the warm cream / terracotta / indigo design system remain in place.

Phase 4 adds a verified-student marketplace, artisan interest requests, paid assignments/contracts, external-payment evidence, private proof storage, confirmation, completion, reviews and disputes. Bharat Bazaar never processes or holds money.

See [Phase 5 report](docs/phase-5-report.md), [Phase 4 report](docs/phase-4-report.md), [API reference](docs/api.md), [architecture](docs/architecture.md), and [deployment](docs/deployment.md).

## Technology

- Client: React 19, Vite 7, TypeScript, Tailwind CSS 4, React Router, Lucide React, Axios, react-i18next (English / Hindi).
- Server: Node.js 24+, Express 5, TypeScript, PostgreSQL on Neon, Drizzle ORM, node-postgres, Zod, bcrypt, jsonwebtoken, express-rate-limit, CORS, Helmet, Morgan and dotenv.
- Tooling: npm workspaces, ESLint, Prettier, Node test runner, Supertest, Playwright and axe-core.
- Keep npm; do not use pnpm or Yarn. No Next.js, Prisma, MongoDB, Firebase, Supabase or Redux.

## Local setup

Requirements: Node.js 24+ and npm 10+, a Neon database, and a Chromium-based browser for optional browser tests.

1. Run `npm install` at the repository root.
2. Configure the server environment using the root `.env.example` as a reference. Put your own values in an ignored root `.env`, or in `server/.env`. Do not overwrite an existing environment file.
3. Supply a strong random `JWT_SECRET` of at least 32 characters, plus the two database URLs. Never use an example or hardcoded password/secret.
4. Run `npm run db:check`.
5. For the checked-in migration, run `npm run db:migrate`, then `npm run db:seed`. Do not generate a new migration merely to set up an existing checkout.
6. Run `npm run dev`.
7. Open **http://localhost:5173**. API liveness: **http://localhost:5000/api/health**.

To run each application separately:

```sh
npm run dev:server
npm run dev:client
```

Keep these in separate terminals. Ctrl+C stops them. For a built server use `npm run build`, then `npm start`. `npm run preview` serves the built frontend on port 4173; set `CLIENT_URL=http://localhost:4173` for API access during a preview session.

### Environment

Precedence for server settings: existing process variables, then `server/.env`, then root `.env`. Paths work from source and compiled server code. No real credentials belong in Git, documentation, screenshots or logs.

| Variable                        | Purpose                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `PORT`                          | API port, default 5000                                                            |
| `NODE_ENV`                      | development, test or production                                                   |
| `CLIENT_URL`                    | Exact permitted browser origin; default http://localhost:5173, no trailing slash  |
| `DATABASE_URL`                  | Pooled Neon connection for runtime queries and seeding                            |
| `DATABASE_URL_UNPOOLED`         | Direct Neon connection for migrations                                             |
| `JWT_SECRET`                    | Required for real authentication; strong random value, at least 32 characters     |
| `JWT_EXPIRES_IN`                | Access-token lifetime, default 7d                                                 |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Optional, both needed to seed the first admin                                     |
| `VITE_API_BASE_URL`             | Client-only public setting in `client/.env`; default http://localhost:5000/api/v1 |

The frontend does **not** load root/server environment files. Use `client/.env.example` only when overriding the client API URL. Never put secrets in any `VITE_` variable. Restart servers after changing environment settings.

The pooled/direct separation follows [Neon’s connection guidance](https://neon.com/docs/connect/connection-pooling). Database connections retain certificate verification; SSL modes that currently alias verify-full are explicitly normalized to verify-full. TLS is never disabled.

### Admin setup

There is no public admin registration or demo admin login. Set your own `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the ignored server environment and run `npm run db:seed`. Passwords require at least 10 characters, a letter and a number, and at most 72 UTF-8 bytes.

The seed adds missing skills by slug and never duplicates them. It creates an admin only if both settings exist and no admin exists. An existing matching admin is left unchanged, including its password. An email collision with a non-admin causes a safe failure, never a role promotion. Remove the admin seed password from the environment after provisioning if no longer needed. There is no password reset workflow in this phase.

## Scripts

| Command                                    | Action                                                   |
| ------------------------------------------ | -------------------------------------------------------- |
| `npm run dev`                              | Run frontend and API together                            |
| `npm run dev:client`, `npm run dev:server` | Run one development server                               |
| `npm run typecheck`                        | Check client, server and server tool/test TypeScript     |
| `npm run lint`                             | ESLint with zero warnings allowed                        |
| `npm run format`, `npm run format:check`   | Format / check formatting                                |
| `npm test`                                 | Unit and real PostgreSQL integration tests               |
| `npm run test:e2e`                         | Chrome browser tests with isolated local test servers    |
| `npm run build`                            | Build client and server                                  |
| `npm start`                                | Run compiled server                                      |
| `npm run preview`                          | Preview compiled client                                  |
| `npm run db:check`                         | Safely check pooled and direct connectivity              |
| `npm run db:generate`                      | Generate SQL from schema changes; review before applying |
| `npm run db:migrate`                       | Apply checked-in SQL using the direct URL                |
| `npm run db:seed`                          | Idempotent skills / optional first-admin seed            |
| `npm run validate`                         | Typecheck, lint, backend tests and production builds     |

Formatting and browser tests are separate from `validate`. No script deploys or commits. Migration and seed failures suppress driver details to avoid leaking credentials; investigate locally using sanitized diagnostics, not by printing connection strings.

## Authentication and authorization

- Artisan registration requires a phone; email is optional. Student registration requires an email; phone is optional. Indian 10-digit phones normalize to +91, and international numbers require a country prefix.
- Email is trimmed and lowercased. Database unique constraints enforce both email and phone uniqueness, including concurrent registrations.
- Passwords use bcrypt cost 12. JWTs use HS256 with issuer, audience, expiry and subject validation.
- Axios consistently sends `Authorization: Bearer <token>`. On reload the client restores the session through `/auth/me`; the server rechecks the database role, account status and token version.
- **localStorage token storage is an MVP decision, not a production-hardened session strategy.** Replace it with a hardened session design before production use, addressing XSS, session rotation, expiry, revocation and CSRF as appropriate.
- Logout increments the account token version, revoking **all current sessions** for that account. If the logout request fails, the UI reports failure; it does not falsely claim server revocation.
- A rejected student can sign in to correct and resubmit a profile. Suspended accounts cannot authenticate. Profile or skill edits reset student verification to pending.
- Admin verification is not email/phone verification. Those flags remain false; this phase implements neither OTP nor email delivery.
- Profile endpoints use the authenticated user ID; they never accept a target user ID. Admin-only endpoints enforce backend roles, independently of frontend guards.
- Auth and public assistance submissions share an in-memory per-IP limit of 30 attempts per 15 minutes. Before multi-instance production use, use a shared limiter store and configure only trusted reverse proxies. Test fixtures disable this limiter explicitly.
- No frontend mock-session mechanism remains.

## Routes and onboarding

Public: `/`, `/about`, `/artisans`, `/students`, `/login`, `/register`, `/register/artisan`, `/register/student`, `/help-register`, `/unauthorized`, and 404.

Each member goes to `/onboarding/artisan` or `/onboarding/student` after registration. Two steps save progress; completion is validated server-side. Member dashboards are at `/dashboard/artisan` and `/dashboard/student`, with editable profiles at `profile`. The admin dashboard includes live `students`, `students/:id`, `assisted-registrations`, `artisans` and `users` pages.

Languages are PostgreSQL text arrays. Profile completion uses required-field checks; optional fields remain nullable. Money estimates are fixed-precision PostgreSQL decimals and are returned as strings. These are business estimates, not payment transactions.

## Folder structure

```text
/
  AGENTS.md
  README.md
  package.json / package-lock.json
  playwright.config.ts / eslint.config.js
  .env.example / .gitignore / .prettierrc.json / .prettierignore
  client/
    .env.example
    index.html / package.json / vite.config.ts / tsconfig*.json
    src/
      assets/       original craft illustration
      components/   shared UI, accessible form controls and dialogs
      context/      real authentication provider
      hooks/        auth, page titles and API data loading
      i18n/         English and Hindi dictionaries
      layouts/      public and role dashboard layouts
      pages/        public, registration, onboarding and dashboard pages
      routes/       route map, role guards and navigation
      services/     Axios, token handling and auth redirects
      types/        client API contracts
      App.tsx / main.tsx / styles.css / phase2.css
  server/
    .env.example / package.json / tsconfig*.json / drizzle.config.ts
    drizzle/        generated SQL and migration metadata
    src/
      config/       validated environment and CORS
      controllers/  HTTP adapters
      routes/       health and versioned domain routes
      middleware/   authentication, authorization, validation and errors
      services/     auth, profiles, admin review and user projections
      db/           connection, migration, seed and connectivity commands
      schemas/      six Drizzle tables and PostgreSQL enums
      validators/   Zod input validation
      types/        API and auth types
      utils/        shared API errors
      app.ts / index.ts
    tests/          unit/integration tests and rollback-only browser fixture
  tests/e2e/        public regressions and Phase 2 browser flows
  docs/            phase reports, API reference and architecture
```

## Test isolation and local browser tests

Backend integration tests require the migrated database. They create unique test identities in an outer PostgreSQL transaction; all writes roll back on success or failure. Services use [Drizzle nested transactions/savepoints](https://orm.drizzle.team/docs/transactions) inside the test transaction. Unrelated user records are not edited or deleted.

Browser tests start their own API on **127.0.0.1:5101** and Vite on **127.0.0.1:5175**, with one worker and a shared rollback-only transaction. Keep these ports free before running them; ordinary development can remain on 5173. The test-only admin fixture uses randomly generated credentials, is bound to localhost, is not compiled into the server build, and is never registered by the production app. All requests to that fixture are serialized. Closing its connection rolls back test data even after an abrupt process exit.

Chrome is the default Playwright channel. Set `PLAYWRIGHT_CHANNEL=msedge` to use Edge, or install Playwright Chromium and use an empty channel value. Reports, traces and screenshots are ignored by Git. They may contain temporary test-session tokens; do not publish them. Automated accessibility checks supplement, but do not replace, manual assistive-technology testing.

## Next phases and eventual deployment

Phase 3 now provides the managed free-trial lifecycle: growth-request ownership, verified-student ranking, admin assignment, discovery review, versioned free-trial contracts, task review and business metrics. Future matching must preserve the same explicit role and profile-verification checks.

Later phases can add broader managed matching, external-payment records, reviews and disputes. Before production: hardened sessions, password recovery, contact verification, abuse controls, operational monitoring, privacy/retention policies and broader accessibility/security review.

Intended deployment targets are **Neon** (PostgreSQL), **Render** (Express API), and **Vercel** (Vite frontend). Configure environment variables, exact CORS origin, client SPA rewrites and trusted proxies when deployment is explicitly requested. Nothing has been deployed in this phase.
