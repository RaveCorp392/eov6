EOV6_Roadmap_Short.md
P0 (now → demo week)

 Bi-directional chat (agent/caller)

 Send details (name, email, phone)

 TTL auto-expiry

 Marketing page /marketing, code entry on /

 Usage tiles (sessions/day, time-to-details, agents online)

 Sentry (frontend)

P1 (next)

 File uploads (images/PDF)

Storage rules: restrict to sessions/{code}; signed read only during active session

Chat renders images inline; PDFs as inline preview; purge with session TTL

Org toggle: enable/disable uploads per industry policy

 Consent / T&Cs checkbox + audit message

 Stripe billing: seat count, portal, webhooks

 Auth for agents (Google/Email link), gate /agent/*

 Admin: org users, canned prompts library, usage export

P2 (later)

 Hardened rules: role-scoped reads/writes; deny after closed

 Webhooks / CRM export

 SSO (SAML/OIDC), audit trails, status page

 Regional hosting options