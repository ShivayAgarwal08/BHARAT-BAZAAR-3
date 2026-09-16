# Phase 4 report

Phase 4 adds the paid managed-work MVP without payment processing.

- Marketplace eligibility requires completed onboarding plus a completed free trial, unless an admin explicitly sets marketplace eligibility.
- Verified, active students can receive artisan interest requests; acceptance creates one PAID assignment.
- Paid contracts retain versioned dual acceptance and generate external-payment records on activation.
- Proof is private PostgreSQL bytea storage, limited to 2 MB JPEG/PNG/PDF, and never returned by ordinary payment APIs.
- Students confirm receipt; the system records verification without claiming to process funds.
- Completion approval updates contract and assignment state; parties can then submit one immutable review each. Admins can hide, but not rewrite, abusive reviews with a reason.
- Disputes are participant-owned and admin-resolved through validated transitions.

Out of scope: payment gateways, wallets, automatic money movement, public proof URLs, chat, email/SMS, deployment and Phase 5 work.
