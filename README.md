# Bharat Bazaar

**Artisans create. Students grow. We connect.**

Bharat Bazaar is a multilingual managed growth platform connecting local artisans with college students. Artisans make products; Student Growth Managers support social media, product catalogues, online listings, customer communication, logistics and business records. The platform is designed to stay involved through verification, matching, discovery, agreements, progress, external-payment records, reviews and disputes.

This repository contains **Phase 1 only**: the technical foundation, responsive public experience, English/Hindi translations, and three dashboard shells. Real authentication, database operations and business workflows are intentionally absent.

## Technology stack

- Client: React 19, Vite 7, TypeScript 5, Tailwind CSS 4, React Router 7, Lucide React, Axios, i18next and react-i18next.
- Server: Node.js, Express 5, TypeScript, Drizzle ORM with the `pg` PostgreSQL driver, Zod 4, CORS, Helmet, Morgan and dotenv.
- Repository: npm workspaces with one root lockfile; ESLint 10, typescript-eslint, React lint plugins, Prettier, concurrently, Node test runner, Supertest, Playwright and axe-core.
- Future hosting: Neon PostgreSQL for data, Render for Express, and Vercel for the React SPA. Nothing is connected or deployed.

Use Node.js **24 LTS** (verified on 24.13.0) and npm **11** (verified on 11.6.2). Use npm only.

## Local setup

From the repository root:

```sh
npm ci
npm run dev
```

`npm ci` installs the versions in `package-lock.json`. For intentional dependency changes, use `npm install` and review the lockfile.

- Frontend: <http://localhost:5173>
- Backend health: <http://localhost:5000/api/health>
- Versioned API: <http://localhost:5000/api/v1>

The dev command starts both workspaces and stops the other if one exits. Use Ctrl+C to stop them. You can also use separate terminals:

```sh
npm run dev:client
npm run dev:server
```

Ports 5173 and 5000 must be available. Vite uses a strict port; it does not silently switch to a different one. The dev server binds to the local loopback interface. Open the frontend using `localhost` so its origin matches the default CORS configuration.

## Environment setup

**No `.env` or credentials are needed for Phase 1.** Safe local defaults let both applications start with the example files untouched. Only example files are included.

When you need custom local configuration, create `server/.env` from `server/.env.example` and `client/.env` from `client/.env.example`. These real environment files are ignored by Git. The root `.env.example` is a reference; the applications do not load a root `.env`.

| Variable                | Purpose / Phase 1 default                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `PORT`                  | API port; `5000`                                                                                        |
| `NODE_ENV`              | `development`, `test` or `production`; `development`                                                    |
| `CLIENT_URL`            | One exact allowed frontend origin; `http://localhost:5173`, with no trailing slash or path              |
| `DATABASE_URL`          | Blank in Phase 1; pooled PostgreSQL URL for future application queries                                  |
| `DATABASE_URL_UNPOOLED` | Blank in Phase 1; direct PostgreSQL URL for future migrations                                           |
| `JWT_SECRET`            | Blank in Phase 1; future authentication will need a randomly generated secret of at least 32 characters |
| `JWT_EXPIRES_IN`        | Future token lifetime; `7d`; currently unused                                                           |
| `VITE_API_BASE_URL`     | Public client configuration; `http://localhost:5000/api/v1`                                             |

Zod rejects malformed supplied values and reports variable names without echoing credentials. Blank database/JWT values are accepted in this phase. Never put a secret in a `VITE_` variable: Vite exposes these values in browser bundles. Restart the appropriate dev server after changing its environment. Production client environment values are captured at build time.

## Available scripts

Run these from the repository root:

| Script                 | Action                                                        |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Start frontend and backend together                           |
| `npm run dev:client`   | Start Vite only                                               |
| `npm run dev:server`   | Start Express with TypeScript watch/reload                    |
| `npm run typecheck`    | Check client source/config and server source/config/tests     |
| `npm run lint`         | Lint application, configuration and tests; fail on warnings   |
| `npm run format`       | Format source and documentation with Prettier                 |
| `npm run format:check` | Check formatting without changing files                       |
| `npm run build`        | Build client into `client/dist` and server into `server/dist` |
| `npm run preview`      | Serve the built client locally on port 4173                   |
| `npm start`            | Run the built server; build first                             |
| `npm test`             | Run backend configuration, validation and HTTP tests          |
| `npm run test:e2e`     | Run browser checks at phone, tablet and desktop sizes         |
| `npm run validate`     | Typecheck, lint, backend tests and both production builds     |
| `npm run db:generate`  | Guarded Drizzle migration generation; reserved for Phase 2    |
| `npm run db:migrate`   | Guarded Drizzle migration application; reserved for Phase 2   |

For a single workspace, use `npm run typecheck --workspace client`, `npm run typecheck --workspace server`, `npm run build --workspace client`, or `npm run build --workspace server`.

The browser suite uses an installed Google Chrome by default and starts Vite if necessary. It does not need an API or database. On Windows, use `$env:PLAYWRIGHT_CHANNEL='msedge'` to select an installed Edge. For Playwright's bundled Chromium, install it explicitly with `npx playwright install chromium` and set `PLAYWRIGHT_CHANNEL` to an empty string. No browser binary was installed as part of Phase 1. Test screenshots/traces and the HTML report are ignored by Git.

## Folder structure

```text
/
├── client/
│   ├── public/                  # Local favicon
│   ├── src/
│   │   ├── assets/             # Original local craft illustration
│   │   ├── components/         # Buttons, inputs, cards, layout helpers and states
│   │   ├── context/            # Explicitly temporary demo session
│   │   ├── hooks/              # Auth and page-title hooks
│   │   ├── i18n/locales/       # English and Hindi dictionaries
│   │   ├── layouts/            # Public and role dashboard layouts
│   │   ├── pages/dashboard/    # Overviews, feature placeholders and dashboard 404
│   │   ├── routes/             # Routes, role guards, navigation configuration
│   │   ├── services/           # Configured Axios client
│   │   ├── types/              # Frontend-only types
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css          # Tailwind entry and shared design tokens/styles
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/             # Zod environment validation and CORS
│   │   ├── controllers/        # Thin HTTP handlers
│   │   ├── db/                 # Deferred Drizzle/pg connection factory
│   │   ├── middleware/         # Request validation, JSON errors and 404
│   │   ├── routes/             # Health and v1 routers
│   │   ├── schemas/            # Reserved for Drizzle tables in Phase 2
│   │   ├── services/           # Service foundation, health response
│   │   ├── types/              # API response contracts
│   │   ├── utils/              # Operational error class
│   │   ├── validators/         # Request/pagination schemas
│   │   ├── app.ts              # Testable app factory
│   │   └── index.ts            # Listener and graceful shutdown
│   ├── tests/
│   ├── drizzle.config.ts
│   └── package.json
├── tests/e2e/                  # Browser and accessibility checks
├── docs/                       # Phase 1 inventory and validation report
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── eslint.config.js
├── playwright.config.ts
├── .prettierrc.json
├── .prettierignore
├── .gitignore
└── .env.example
```

The exact created-file inventory and observed validation results are in [the Phase 1 report](docs/phase-1-report.md).

## Routes and preview behavior

Public routes are `/`, `/about`, `/artisans`, `/students`, `/login`, `/register`, and a catch-all 404 page.

Open `/login` and choose Artisan, Student Growth Manager or Admin, then select **Open demo dashboard**. Email/password inputs are disabled and no credentials are accepted. Registration selects a preview role; it does not create an account. The admin preview is not public admin registration.

Dashboard roots are `/dashboard/artisan`, `/dashboard/student`, and `/dashboard/admin`. All requested navigation entries have routes. A single configuration in `client/src/routes/dashboard-config.ts` drives the navigation, titles and route registration. Each role has a sample overview; other features show a polished, inactive placeholder.

The temporary session lives only in React memory. Refreshing ends the preview. Unauthenticated dashboard navigation redirects to the matching role selector, preserving the destination; attempting another role's route redirects to the current role's overview. These are **UI guards only**, not real authentication or authorization. Server-enforced roles and permissions must be implemented before any private data or real workflow is added.

All names, metrics and activities are labelled as sample data. The transformation story is labelled as an illustrative example. No payment processing, fund transfer, matchmaking, contracts, notifications, reviews or disputes run in this phase.

## API foundation

`GET /api/health` and `GET /api/v1/health` return:

```json
{
  "success": true,
  "message": "Bharat Bazaar API is running"
}
```

This endpoint checks process liveness only, not database readiness. `GET /api/v1` returns a small Phase 1/version response. Other endpoints return a JSON 404.

Middleware includes Helmet, exact-origin CORS, a 100KB JSON body limit, Morgan method/status/duration logging, and centralized error responses. Query strings, bodies, credentials and stack traces are not logged or returned. CORS is not an authorization mechanism; tools without an Origin header can access the public API.

Future route validators should describe `{ body, params, query }` in a Zod schema and run `validateRequest(schema)` before a controller. Use the parsed/coerced values from `res.locals.validated`. Do not mutate Express 5's read-only `request.query`. Request validators belong in `validators/`; database table schemas belong in `schemas/`.

## Database preparation and next phase

`server/src/db/index.ts` exports a deferred factory for a shared `pg` connection pool and Drizzle. The running Phase 1 application never imports or invokes it. No schema tables or migrations have been created, and no external database has been contacted.

The [Neon connection guidance](https://neon.com/docs/connect/connection-pooling) informed the split between pooled application traffic and a direct migration connection. The factory retains the connection string's SSL options. Follow [Drizzle's PostgreSQL documentation](https://orm.drizzle.team/docs/get-started-postgresql) when adding the schema and migrations in Phase 2. Do not disable TLS certificate validation.

Both Drizzle commands fail before doing any work unless `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are present. When Phase 2 is authorized:

1. Create the Neon project and a development branch; configure both connection URLs securely.
2. Agree on identity, roles, profiles, verification and audit-record schemas before generating migrations.
3. Add and review Drizzle migrations against the development database.
4. Implement real authentication, password handling, server-side role authorization and validated onboarding APIs; replace the demo context.
5. Add persistence and readiness checks with integration tests.

Later phases can add managed matching/discovery, contracts, milestones/tasks, progress reports, business records, external-payment records, portfolio/completed projects, reviews and disputes. Their order and scope require a separate request. Phase 2 has not started.

## Design and internationalization

The design uses cream, terracotta, indigo, muted gold and sage with local vector artwork and system fonts. It has no remote image, font or translation dependency. Tailwind tokens and reusable components provide buttons, inputs, badges, cards, loading and empty states. Layouts include keyboard focus styles, a skip link, semantic headings, native modal mobile drawers and reduced-motion handling.

English and Hindi dictionaries live in `client/src/i18n/locales/`. `react-i18next` powers the visible language selector; only language preference is stored locally. Storage-disabled browsers still work. The document language updates on selection. Add future languages through the same resource structure; do not call external translation APIs.

## Planned deployment targets

No deployment has been performed. Before a future deployment, remove/replace mock authentication and complete the appropriate security and integration phase.

- **Neon:** managed PostgreSQL and isolated development/production branches; store URLs only on the server.
- **Render:** Node/Express service. From the repository root, install with `npm ci`, build with `npm run build --workspace server`, and start with `npm start`. Provide server environment variables through Render. Configure `/api/health` as a liveness probe and the real Vercel origin as `CLIENT_URL`.
- **Vercel:** React/Vite static client. Use repository-root install `npm ci`, build `npm run build --workspace client`, output `client/dist`, and configure `VITE_API_BASE_URL` to the Render `/api/v1` URL. Configure SPA fallback rewrites to `index.html` so deep links work; this has not yet been configured or tested on Vercel.

## Git and validation

No automatic commit is made. Git history is preserved. `node_modules`, builds, real environment files, logs, editor files, temporary uploads and test artifacts are ignored. Review `git status` before committing.

Use `npm run validate`, `npm run test:e2e`, `npm run format:check`, and `npm audit` when validating a phase. The Phase 1 report records what was actually run, including environment limitations and any remaining warnings.
