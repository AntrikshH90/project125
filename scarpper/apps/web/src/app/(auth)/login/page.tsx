"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wheat, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        await api.post("/api/auth/sign-up", { name, email, password });
      } else {
        await api.post("/api/auth/sign-in", { email, password });
      }
      router.replace("/overview");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dh-grid-bg flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-accent shadow-lg shadow-amber-500/20">
            <Wheat className="h-6 w-6 text-zinc-950" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-white">DataHarvest</h1>
            <p className="mt-1 text-xs text-slate-dim">
              {mode === "signin" ? "Sign in to your dataset workbench" : "Create an account and start harvesting"}
            </p>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-dim">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" required minLength={2} />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-dim">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@lab.org" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-dim">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Minimum 8 characters" : "••••••••"}
                required
                minLength={mode === "signup" ? 8 : 1}
              />
            </div>

            {error && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-dim">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button onClick={() => setMode("signup")} className="text-amber-400 hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already registered?{" "}
                <button onClick={() => setMode("signin")} className="text-amber-400 hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </Card>

        <p className="mt-6 text-center text-[11px] text-zinc-600">
          <Link href="/overview">→</Link> Sessions are httpOnly and expire after 14 days.
        </p>
      </div>
    </div>
  );
}
