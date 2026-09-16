# Bharat Bazaar development rules

- Inspect existing files and repository instructions before editing.
- Keep the selected PERN stack: PostgreSQL, Express, React, and Node.js, with TypeScript, Vite, Tailwind CSS, React Router, and Drizzle ORM.
- Do not introduce alternative frameworks without permission. Use npm workspaces; do not use pnpm or yarn.
- Avoid duplicate components, schemas, and routes. Extend the existing shared foundations.
- Keep frontend (`client/`) and backend (`server/`) clearly separated. Never expose server code or environment variables to the client.
- Validate all API inputs with Zod before using them. Keep error responses consistent.
- Protect secrets. Only commit safe `.env.example` files; never log credentials, tokens, or request bodies.
- Enforce role-based authorization on the server for every protected API. Derive ownership from the authenticated user, never a submitted user ID. Frontend route guards are not a security boundary. Never restore the removed Phase 1 mock session mechanism.
- Keep code beginner-readable with descriptive names, small modules, and comments that explain intent.
- Implement only the requested phase. Phase 2 includes accounts, onboarding, assistance requests and admin verification. Growth requests, matching, contracts, milestones, payments, reviews and disputes require later explicit requests.
- Run type checking, linting, builds, relevant tests, and local smoke checks after every phase. Report actual results and remaining limitations.
- Do not run migrations without a configured `DATABASE_URL`; use `DATABASE_URL_UNPOOLED` for migrations. Never connect services or change remote data unless the task authorizes it.
- Preserve user changes and Git history. Never commit automatically.
- Never deploy without explicit permission.
