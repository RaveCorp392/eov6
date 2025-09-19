import React from "react";
import ClientInit from "./ClientInit";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClientInit />
      {children}
    </>
  );
}

