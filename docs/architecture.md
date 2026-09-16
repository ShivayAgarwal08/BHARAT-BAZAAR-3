# Phase 2 architecture

## Request path

Browser → Axios (Bearer token) → Express security/CORS/body limits → rate limit where applicable → authentication → role authorization → Zod envelope validation → controller → service → Drizzle → PostgreSQL.

Routes define permissions and validation. Controllers handle HTTP envelopes. Services own transactions, ownership and status rules. Drizzle schemas define database structure independently of Zod request validators. Safe user projections explicitly exclude hashes and token versions.

## Data foundation

- users: UUID identity, unique normalized email/phone, required-contact constraint, role/account status, language and verification flags. tokenVersion supports logout revocation.
- artisan_profiles: unique user FK, business details, language text array, optional estimates and onboarding completion.
- student_profiles: unique user FK, education, availability, optional rate/portfolio, language array, verification status/notes and onboarding completion.
- skills: unique slug and active flag; seed never duplicates or overwrites existing skills.
- student_skills: composite primary key (profile, skill), proficiency; indexed by skill.
- assisted_registration_requests: contact/call details, status and optional assigned admin.

Deleting a user cascades to its profile and student skill links. A deleted admin is unassigned from assistance requests, which remain. Referenced skills use RESTRICT deletion; prefer deactivation. There are **no deletion API endpoints** in Phase 2.

The initial generated migration only creates these tables, six enums, indexes and constraints. No unrelated database objects are removed. Drizzle keeps applied migration records in its migration journal. Do not edit an already applied SQL migration; generate a new migration for subsequent schema changes.

## State and concurrency

Registration creates user/profile in one transaction. Database uniqueness wins races between concurrent registrations. Student profile and skill replacement use one transaction and a profile row lock. Admin review uses the same profile lock plus expectedUpdatedAt. Updated timestamps have millisecond precision to match the JSON Date representation. Service updates explicitly maintain updatedAt.

Draft fields are nullable until completion. Completion validates merged profile fields; database checks provide another guard for essential fields. Status changes and skill replacements cannot target a caller-supplied user ID.

Assistance submission returns only the new request ID/status. Contact details are behind ADMIN routes. A status change assigns the request to the authenticated admin but does not make a phone call or create an account.

## Frontend

The existing public and dashboard layouts are retained. AuthProvider restores real sessions, publishes loading/error states, and removes invalid sessions on 401. Bearer tokens are stored in localStorage with an in-memory fallback. Cross-tab token changes reload the current page to restore the correct session. Request cancellation avoids stale page results.

New components reuse the Phase 1 primitives. Native dialogs provide keyboard-modal behavior for confirmations. Data forms have labels, touch-sized controls, feedback states and EN/HI strings. Public user-entered content remains in the language it was submitted; it is not automatically translated.

Future workflow links remain explicit placeholders, not mock successful operations. Onboarding eligibility and role navigation are enforced in the UI, while every API independently enforces its permissions.

## Tests and boundaries

Integration and browser fixtures inject a Drizzle transaction into the application. Nested service transactions use savepoints. Tests create random unique identities and always roll back the outer transaction, with no broad cleanup DELETE. The browser fixture serializes requests on its single connection and runs on a separate localhost port.

The fixture-only admin-session route lives under server/tests and is excluded from the build. The normal server never registers it. Playwright uses one worker, starts its own two servers and tears them down afterward.

A health response is liveness, not proof of database readiness. Use db:check to verify both actual connection paths. Production hardening, operational audit history, contact verification, password recovery and session redesign remain outside this phase.
