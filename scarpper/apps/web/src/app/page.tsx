"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

export default function RootRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    api
      .get("/api/auth/me")
      .then(() => router.replace("/overview"))
      .catch(() => router.replace("/login"));
  }, [router, pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-950">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-accent border-t-transparent" />
    </div>
  );
}
