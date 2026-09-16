# Phase 3 API reference

All domain routes are under `/api/v1`. Requests and responses use JSON. Authenticated requests send an Authorization Bearer token. No cookies or social/OTP login are used.

Success: `{ success: true, message: string, data: ... }`. Errors: `{ success: false, message: string, error: { code, details? } }`. Validation details contain field paths and safe messages, never submitted values. UI translations use error codes. Password hashes and token versions are never returned.

## Endpoints

| Method | Path (after /api/v1)              | Access               | Input / response                                                                                |
| ------ | --------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| POST   | /auth/register/artisan            | Public, rate limited | fullName, phone, password, preferredLanguage; optional email → token and user                   |
| POST   | /auth/register/student            | Public, rate limited | fullName, email, password, preferredLanguage; optional phone → token and user                   |
| POST   | /auth/login                       | Public, rate limited | identifier (email/phone), password → token and user                                             |
| POST   | /auth/logout                      | Authenticated        | Empty object → null; revokes all current tokens for account                                     |
| GET    | /auth/me                          | Authenticated        | Safe user, fullName, onboardingCompleted                                                        |
| GET    | /artisans/me                      | ARTISAN              | Own profile                                                                                     |
| PUT    | /artisans/me                      | ARTISAN              | Validated profile fields → own updated profile                                                  |
| GET    | /students/me                      | STUDENT              | Own profile and skills                                                                          |
| PUT    | /students/me                      | STUDENT              | Validated profile fields, optional skills → updated profile                                     |
| PUT    | /students/me/skills               | STUDENT              | skills array → updated own profile                                                              |
| GET    | /skills                           | Public               | Active skills                                                                                   |
| POST   | /assisted-registrations           | Public, rate limited | name, phone, preferredLanguage, preferredCallTime, city, state, optional notes → id/status only |
| GET    | /admin/overview                   | ADMIN                | totalArtisans, totalStudents, pendingStudentVerifications, pendingAssistedRegistrations         |
| GET    | /admin/users                      | ADMIN                | Paginated users; optional role                                                                  |
| GET    | /admin/students                   | ADMIN                | Paginated profile/user records; optional verificationStatus                                     |
| GET    | /admin/students/:id               | ADMIN                | Full student profile, safe user and skills; id is profile UUID                                  |
| POST   | /admin/students/:id/verify        | ADMIN                | expectedUpdatedAt, optional notes                                                               |
| POST   | /admin/students/:id/reject        | ADMIN                | expectedUpdatedAt, required notes (3–2000 characters)                                           |
| GET    | /admin/assisted-registrations     | ADMIN                | Paginated requests including private contact details; optional status                           |
| PATCH  | /admin/assisted-registrations/:id | ADMIN                | status, expectedUpdatedAt → request assigned to current admin                                   |
| GET    | /health                           | Public               | Liveness only, no database query                                                                |

Also `GET /api/health` returns `{ "success": true, "message": "Bharat Bazaar API is running" }`. `GET /api/v1` reports phase 3.

Pagination: `page` defaults to 1; `limit` defaults to 20 (maximum 100). Responses contain `items, total, page, limit`. Filters are uppercase enums and unknown fields are rejected.

## Profile updates

Profile rows are created transactionally during registration, with fullName and onboardingCompleted=false. PUT is a partial field update, not a replacement of unspecified fields. IDs, role, account status, verification fields, timestamps and ownership cannot be set by the member.

Artisan fields: fullName, businessName, craftCategory, city, state, address, languages, biography, currentMonthlyRevenue, currentMonthlyOrders, onlinePresence, businessProblems, onboardingCompleted.

Student fields: fullName, college, course, studyYear, city, state, languages, biography, weeklyAvailabilityHours, expectedMonthlyRate, portfolioUrl, onboardingCompleted, optional skills. Each skill selection contains `skillId` and `proficiencyLevel` (BEGINNER, INTERMEDIATE, ADVANCED). Selection replaces the member’s skill set atomically; duplicate and inactive/missing skills are rejected.

Send onboardingCompleted=true to finish. The server validates the **merged** existing and submitted profile. Artisan completion requires business name, craft, location, languages, online presence and business problems. Student completion requires college, course, study year (1–8), location, languages, biography, weekly availability (1–60 hours) and at least one skill. Required values cannot be cleared on a completed profile. Profile completion cannot be undone through the member API.

Optional monetary inputs are nonnegative JSON numbers with a maximum of 9,999,999,999.99; stored decimals return as strings. Optional text and monetary fields may be cleared with null. Languages are nonempty strings, with at most 12 distinct entries. URLs must use HTTP(S).

Saving a student profile or skill selection resets verificationStatus=PENDING, clears verificationNotes, and sets accountStatus=PENDING. Completing an artisan profile sets accountStatus=ACTIVE. New students remain pending until admin review. Admin verification sets ACTIVE; rejection sets REJECTED and preserves notes for the student to correct their profile. Rejected students can still sign in; suspended accounts cannot.

## Admin safeguards

Only completed student profiles can be verified/rejected. The backend locks the profile during review. Supply the last-read ISO timestamp `expectedUpdatedAt`; a stale request returns 409 STALE_RECORD. Suspended users cannot be activated through verification. Assisted updates also use expectedUpdatedAt and do not create accounts or send calls automatically.

Admin review is an MVP status change with notes and timestamps, not a full immutable audit trail. Add an audit model in a separately approved phase before production.

## Security and errors

Authentication uses database-backed JWT version checks and HS256 issuer/audience/expiry checks. Frontend guards do not authorize API access. Profile ownership comes exclusively from the authenticated subject.

Typical status codes: 201 creation; 200 success; 400 validation; 401 authentication; 403 role/origin denied; 404 unknown route/record; 409 duplicate contacts or stale status; 413 large body; 429 rate limit; 500 generic internal error.

Common codes: VALIDATION_ERROR, INVALID_CREDENTIALS, UNAUTHENTICATED, FORBIDDEN, CONTACT_EXISTS, STALE_RECORD, INVALID_SKILLS, SKILLS_REQUIRED, ONBOARDING_REQUIRED, ACCOUNT_SUSPENDED, NOT_FOUND, RATE_LIMITED.

## Phase 3 free-trial endpoints

| Method       | Path (after `/api/v1`)                                                        | Access           | Purpose                                 |
| ------------ | ----------------------------------------------------------------------------- | ---------------- | --------------------------------------- |
| GET/POST     | `/artisans/me/growth-requests`                                                | ARTISAN          | List/create owned requests              |
| GET/PUT      | `/artisans/me/growth-requests/:id`                                            | ARTISAN owner    | View/edit a draft                       |
| POST         | `/artisans/me/growth-requests/:id/submit`                                     | ARTISAN owner    | Submit request                          |
| GET/POST     | `/students/me/assignments`, `/:id/accept`                                     | STUDENT owner    | View/accept an assignment               |
| GET/PUT/POST | `/students/me/assignments/:id/discovery`, `/submit`                           | STUDENT owner    | Read, save or submit discovery          |
| GET/POST     | role-owned `/contracts/:id`, `/:id/accept`                                    | Contract party   | Read and accept current version         |
| GET/POST     | role-owned `/contracts/:id/tasks`, `/:id/metrics`                             | Contract party   | Read tasks; read/write metrics          |
| PATCH        | `/students/me/tasks/:id`                                                      | Assigned STUDENT | Update/submit task                      |
| PATCH        | `/artisans/me/tasks/:id/review`                                               | Assigned ARTISAN | Approve/request revision                |
| GET/PATCH    | `/admin/growth-requests`, `/:id/review`                                       | ADMIN            | Queue and review requests               |
| GET/POST     | `/admin/growth-requests/:id/candidates`, `/:id/assign`                        | ADMIN            | Ranked candidates and manual assignment |
| PATCH/GET    | `/admin/assignments/:id/discovery`, `/admin/assignments/:id`                  | ADMIN            | Review discovery and view progress      |
| POST/PUT     | `/admin/contracts`, `/admin/contracts/:id`                                    | ADMIN            | Create/edit contracts                   |
| POST         | `/admin/contracts/:id/send`, `/:id/milestones`, `/admin/milestones/:id/tasks` | ADMIN            | Send plan and create work items         |
