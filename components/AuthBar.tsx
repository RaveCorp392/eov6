"use client";

import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithRedirect, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthBar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setEmail(u?.email || null));
    return () => unsub();
  }, []);

  async function doSignIn() {
    await signInWithRedirect(auth, new GoogleAuthProvider());
  }

  async function doSignOut() {
    await signOut(auth);
  }

  return (
    <div className="mb-4 flex items-center gap-3 text-sm">
      {email ? (
        <>
          <span className="text-zinc-700">
            Signed in as <b>{email}</b>
          </span>
          <button className="rounded border px-2 py-1" onClick={doSignOut}>
            Sign out
          </button>
        </>
      ) : (
        <button className="rounded border px-2 py-1" onClick={doSignIn}>
          Sign in
        </button>
      )}
    </div>
  );
}
