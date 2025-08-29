# EOV6 — Version 0.1 Success Snapshot
_Date: 29 Aug 2025_

---

## ✅ Features Working

1. **Sessions**
   - Agent can create a session → caller joins with 6-digit code.
   - Session ID displays on both agent and caller pages.
   - Sessions persist in Firestore with TTL expiry.

2. **Chat**
   - Bi-directional text chat works.
   - Caller ↔ Agent roles display correctly in the thread.
   - Autoscroll works (new messages always visible).
   - Dark mode UI consistent.

3. **Caller Details**
   - Caller can submit **name, email, phone**.
   - Details appear immediately in the Agent console under “Caller details”.

4. **File Uploads**
   - Caller can upload PDF/image files.
   - Files are stored under `/uploads/{sessionId}/`.
   - Agent sees file name + link → opens in new tab.

---

## ⚠️ Known Issues
- Upload messages don’t yet auto-insert into chat stream (file shows as link only).
- Occasional duplicate upload buttons visible.
- Caller landing page is not yet restored to simple centered **6-digit code entry + IVR link**.

---

## 🚀 Next Steps
- Polish chat rendering (make it look like original wireframe).
- Fix upload message → auto chat bubble with download link.
- Restore clean caller landing (code input + links).
- Tighten Firestore/Storage rules (currently permissive for demo).
- Branch strategy → protect v0.1 snapshot before iterating on UI.

---
