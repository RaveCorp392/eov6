# EOV6 – Full Markup

## MVP Wireframe Components
- Landing page → Session code entry.
- Caller side:
  - Enter 6-digit code.
  - Form for name/email/phone.
  - Chat window with role=caller.
  - File upload (PDF/images).
- Agent side:
  - Session list + selected session view.
  - Chat window with role=agent.
  - Caller details panel.
  - File upload (for agent sending).
- Shared:
  - Dark mode.
  - Autoscroll.
  - Ephemeral session cleanup.

## Firebase Structure
- **Firestore**
  - `sessions/{sessionId}`
    - `messages/{messageId}`
      - text, role, timestamp
    - `details/`
      - name, email, phone, identified
- **Storage**
  - `uploads/{sessionId}/{filename}`

## Technical Decisions
- Next.js App Router for pages.
- Tailwind for fast UI.
- Firebase SDK for realtime sync.
- Vercel hosting.

## Known Gaps
- Caller detail form not yet wired to Firestore.
- Uploaded file doesn’t push message with URL.
- Double file upload button.

