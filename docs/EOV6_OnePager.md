EOV6_OnePager.md
EOV6 — Secure details, shared fast.

Problem: On calls, collecting PII (name, email, phone) is slow and error-prone—spelling mistakes, accents, rework.
Solution: Agent starts a session, shares a short code. Caller enters it at eov6.com, sends their details with one tap, and can chat. All data is ephemeral by policy.

Why now

Teams are moving between chat and voice constantly; identity capture is the drag point.

Privacy expectations are rising; “collect less, keep less” is a feature.

How it works

Agent opens session → gets a code.

Caller goes to eov6.com → enters code.

Caller taps Send details (name, email, phone) or agent uses canned prompts.

Session auto-expires via TTL.

What’s live today (MVP)

Agent console + caller page with bi-directional chat

One-tap Send details (name, email, phone)

Canned prompts: Ask name / Ask email / Ask phone

Time-to-live deletion (no long-term PII by default)

/marketing landing and simple domain setup

Roadmap (near-term)

File uploads (images/PDF) with TTL, “privacy mode” render in chat (no persistent download)

Consent & T&Cs (checkbox + audit line)

Stripe billing (per seat; usage add-ons later)

Org/team admin, canned prompt libraries

Optional IVR prefill prefixes (e.g., SQ-XXXXXX), webhooks/CRM

Business model (proposed)

Per-agent monthly plan + usage tiers; free sandbox for trials.

Status

MVP built and deployed in <24h; live demo available.

Privacy-first architecture; minimal data model; easy to integrate.

Contact: partners@meetsafe.io