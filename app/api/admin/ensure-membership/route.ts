import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { resolveOrgIdFromEmail as simpleResolve } from "@/lib/org-resolver";

export async function POST(req: Request) {
  try {
    const authz = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authz?.startsWith("Bearer ") ? authz.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const auth = getAuth();
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded?.uid;
    const email = (decoded?.email || "").toLowerCase();
    if (!uid || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Prefer simple resolver for fast bootstrap; fall back to domain lookup in Firestore if needed
    let orgId = simpleResolve(email);
    if (!orgId) orgId = "default";
    const ref = adminDb.doc(`orgs/${orgId}/members/${uid}`);
    const snap = await ref.get();

    let role: string | null = snap.exists ? ((snap.data() as any)?.role || null) : null;

    if (!role) {
      // First member becomes owner, or owner override by ADMIN_BOOTSTRAP_EMAIL
      const membersSnap = await adminDb.collection(`orgs/${orgId}/members`).limit(1).get();
      const first = membersSnap.empty;
      const ownerEmail = String(process.env.ADMIN_BOOTSTRAP_EMAIL || "").toLowerCase();
      const shouldBeOwner = first || (!!ownerEmail && email === ownerEmail);
      role = shouldBeOwner ? "owner" : "viewer";
      await ref.set({ role, email, createdAt: new Date() }, { merge: true });
    }

    return NextResponse.json({ orgId, role });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
