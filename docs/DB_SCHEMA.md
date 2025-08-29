# EOV6 — Firestore & Storage schema (locked v1)

## Collections

### sessions (collection)
- **doc id**: 6-digit session code as a string, e.g. `"118563"`
- **fields**
  - `active`: boolean (default true)
  - `createdAt`: timestamp (server)
  - `expiresAt`: timestamp (server) — usually `createdAt + 2h`
  - `agentId`: string | null — auth uid of the agent who created/claimed the session
  - `lastActivityAt`: timestamp (server) — updated on any message write

> Creation: by **agent** app only.

#### messages (subcollection under `sessions/{code}`)
- **doc id**: auto
- **fields**
  - `role`: `"agent"` | `"caller"` | `"system"`
  - `type`: `"text"` | `"file"` | `"details"`
  - `text`: string | null — for `type:"text"`
  - `details`: { `name`: string, `email`: string, `phone`: string } | null — for `type:"details"`
  - `file`: {
      `name`: string,
      `size`: number,            // bytes (<= 10 MB)
      `contentType`: string,     // image/* or application/pdf
      `storagePath`: string,     // `uploads/{code}/{fileId}`
      `downloadURL`: string
    } | null — for `type:"file"`
  - `createdAt`: timestamp (server)
  - `by`: string | null — agent uid or `"anon"`
  - `visibleTo`: `"both"` | `"agent"` (default `"both"`)

> **All user-visible “events” are messages.** No separate “uploads” collection needed.

## Storage (Firebase Storage)

- **path**: `uploads/{code}/{fileId}`
  - `{code}` is the same 6-digit session code
  - `{fileId}` is a random id + original extension
- Objects should include (client-provided) metadata:
  - `sessionCode` = `{code}`
  - `uploadedBy` = `"agent"` | `"caller"`
