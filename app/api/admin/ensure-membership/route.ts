import { NextResponse } from "next/server";
import { adminDb, getAdminApp } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const authz = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authz?.startsWith("Bearer ") ? authz.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const app = getAdminApp();
    const auth = getAuth(app);
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded?.uid;
    const email = (decoded?.email || "").toLowerCase();
    if (!uid || !email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = adminDb;
    const entSnap = await db.collection("entitlements").doc(email).get();
    const orgId = entSnap.exists ? (entSnap.data() as any)?.orgId || null : null;

    let role: string | null = null;
    if (orgId) {
      const memberRef = db.collection("orgs").doc(orgId).collection("members").doc(uid);
      const memberSnap = await memberRef.get();
      if (memberSnap.exists) {
        role = (memberSnap.data() as any)?.role || null;
      } else {
        role = "viewer";
        await memberRef.set({ role, email, createdAt: Date.now() }, { merge: true });
      }
    }

    const DEBUG = process.env.DEBUG_API === "1" || process.env.NODE_ENV !== "production";
    if (DEBUG) {
      console.log("[ensure-membership]", { uid, email, orgId, role });
    }

    return NextResponse.json({ orgId, role });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
