# EOV6 v0.3.8
Agent-led flow, caller Send details, IVR prefill, Tailwind UI.

## Firestore rules (MVP open)
rules_version='2';service cloud.firestore{match /databases/{db}/documents{match /sessions/{s}{allow read,write: if true;match /messages/{m}{allow read,write: if true;}}}}
