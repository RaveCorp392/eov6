✅ Success State — August 29, 2025
Core Features Working

Chat
Caller can send free-text chat messages.
Agent can send free-text chat messages.
Messages display correctly on both sides with role labels (CALLER: / AGENT:).

Send Details
Caller can submit name, email, phone.
Agent sees latest caller details in the details panel.
A system message logs in the chat stream when details are shared.

File Upload
Caller can upload a file (image/* or application/pdf, ≤10MB).
Upload stores in Firebase Storage under uploads/{sessionCode}/{timestamp}-{filename}.
A FILE event is written to Firestore with name, size, url, role.
Agent and caller both see a clickable file link in the chat stream.
Agent can open file link in new tab (no preview inline).

Session Info
Session ID displays clearly on the agent side.
Event feed is ordered chronologically.
Database / Storage Schema (v1 locked)

See DB_SCHEMA.md
 for full detail. In short:

Firestore
sessions/{code}/events/{eventId}
type: "CHAT" | "DETAILS" | "FILE" | "SYSTEM"
role: "CALLER" | "AGENT" (where applicable)
text (chat), details (name/email/phone), file (metadata).

Storage
uploads/{code}/{fileId}
Rules (MVP state)
Firestore: sessions/{sid}/events/** → open for read/write (to be tightened).
Storage: uploads/{sid}/** → open for read/write (to be tightened).

Known Gaps
Caller landing page not yet restored to minimal keypad + IVR/info links.
Styling is functional but not “pretty” (monospace feed, plain inputs).
Rules are permissive; need tightening before investor/production demo.
No system cleanup yet (no TTL or Cloud Function to clear expired sessions/files).

Next Steps
Re-pretty the caller landing page (6-digit keypad entry, centered, mobile-first).
Style chat feeds and details panels for readability (light grouping, padding).
Tighten rules (session-scoped, type/size limits).
Add TTL cleanup job.