// lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

declare global {
  // Allow global reuse in dev to avoid re-init warnings
  // eslint-disable-next-line no-var
  var __eov6_admin: admin.app.App | undefined;
}

function init() {
  if (global.__eov6_admin) return global.__eov6_admin;

  if (!admin.apps.length) {
    const inline = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (inline) {
      const creds = JSON.parse(inline);
      admin.initializeApp({
        credential: admin.credential.cert(creds as admin.ServiceAccount),
      });
    } else {
      // Uses GOOGLE_APPLICATION_CREDENTIALS if provided
      admin.initializeApp();
    }
  }

  global.__eov6_admin = admin.app();
  return global.__eov6_admin;
}

const app = init();
export { admin }; // in case something else imports { admin }
export const adminDb = admin.firestore(app);
