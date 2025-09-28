"use client";
import { useEffect } from "react";

export default function ThanksPage() {
  useEffect(() => {
    const qs = typeof window !== "undefined" ? window.location.search : "";
    if (qs && qs.includes("session_id=")) {
      window.location.replace(`/onboard${qs}`);
    } else {
      window.location.replace("/onboard");
    }
  }, []);
  return null;
}
