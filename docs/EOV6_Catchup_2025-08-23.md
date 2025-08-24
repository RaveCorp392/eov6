EOV6_Catchup_2025-08-23.md
TL;DR

✅ Live MVP on Vercel with Firebase (Firestore)

✅ Agent opens a session → caller joins with code → bi-directional chat

✅ Caller can Send details (name, email, phone) — shows instantly for agent

✅ TTL cleanup enabled (sessions auto-expire)

✅ Marketing page at /marketing; home / is “enter code” + “learn more”

✅ Domains set via Namecheap → Vercel (A @ 76.76.21.21, CNAMEs to cname.vercel-dns.com)

Today’s build

Framework: Next.js (App Router), TypeScript, Tailwind

Hosting: Vercel (Node 20, default next build)

Install tuning: .npmrc (retries, pinned registry), package-lock.json

Env (public):

NEXT_PUBLIC_FIREBASE_* (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)

NEXT_PUBLIC_CODE_LENGTH=6

Routing:

/ — code entry + “Learn about EOV6” → /marketing

/marketing — investor/overview landing

/agent — agent console (create code / open session)

/agent/s/[code] — agent session view

/s/[code] — caller session view

/ivr — simple prefill + code

Key files (public API):

lib/firebase.ts → exports app, db, serverTimestamp, Timestamp, isFirebaseReady

lib/code.ts → randomCode, expiryInHours(Timestamp), Msg type

app/s/[code]/page.tsx (caller) → send details, chat, local-only “Leave session”

app/agent/s/[code]/page.tsx (agent) → chat, ask prompts, End session (sets closed)

app/marketing/page.tsx, app/page.tsx (home)

Data model (MVP)
sessions/{code} {
  name, email, phone, identified, createdAt, updatedAt,
  expiresAt (Timestamp), closed (bool), closedAt (Timestamp)
}

sessions/{code}/messages/{id} {
  text, from: 'caller'|'agent', at (Timestamp) [, expiresAt (optional)]
}

Firestore rules (MVP/dev – permissive; tighten after demos)
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /sessions/{code} {
      allow read, write: if true;
      match /messages/{id} { allow read, write: if true; }
      match /profile/{p}  { allow read, write: if true; }
    }
  }
}


Post-demo: scope access by session code + role, enforce expiresAt windows, deny after closed==true except agent reads.

TTL / lifecycle

TTL policy on sessions using expiresAt (1h).

We refresh expiresAt on profile updates; messages use at and may include expiresAt as needed.

DNS / domains

Namecheap:

@ A → 76.76.21.21

www / agent / admin CNAME → cname.vercel-dns.com

Vercel → Project → Domains: attach eov6.com, www.eov6.com, agent.eov6.com (and admin if needed).

Deploy notes

Build Command: default (next build)

Install Command (override): npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/

Git: Production branch = main, auto deploys ON

Known good flows

Caller “Send details” includes phone (fixed)

Caller “Leave session” → local navigation only (agent session persists)

Agent “End session” → sets {closed: true, closedAt}; caller input disabled

Open items (tracked)

 Tighten Firestore rules post-demo (role + session scoping)

 Add admin usage tiles (sessions today, time-to-details, agent count)

 Add simple Sentry (frontend)

 Add graceful “Session ended” UX on caller

 Optional: add expiresAt to messages (align with session TTL)