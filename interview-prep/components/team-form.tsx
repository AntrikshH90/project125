"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogIn, Loader2 } from "lucide-react";

export function TeamForm() {
  const router = useRouter();
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [userName, setUserName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function create() {
    setError(null);
    if (!userName.trim() || !createName.trim()) {
      setError("Please enter your name and team name");
      return;
    }
    const r = await fetch("/api/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create", name: createName, userName }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error ?? "Failed");
      return;
    }
    startTransition(() => router.push("/team"));
    router.refresh();
  }

  async function join() {
    setError(null);
    if (!userName.trim() || !joinCode.trim()) {
      setError("Please enter your name and team code");
      return;
    }
    const r = await fetch("/api/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "join", code: joinCode, userName }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error ?? "Failed");
      return;
    }
    startTransition(() => router.push("/team"));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">
          Your name
        </label>
        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="e.g. Antriksh"
          className="mt-1.5"
        />
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-[var(--accent)]" />
          <div className="font-semibold">Create a team</div>
        </div>
        <input
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          placeholder="Team name (e.g. Apex Coders)"
        />
        <button
          onClick={create}
          disabled={isPending}
          className="btn btn-primary w-full"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Create team
        </button>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <LogIn size={16} className="text-[var(--accent)]" />
          <div className="font-semibold">Join existing team</div>
        </div>
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Team code (e.g. APEX42)"
        />
        <button
          onClick={join}
          disabled={isPending}
          className="btn btn-secondary w-full"
        >
          <LogIn size={14} /> Join team
        </button>
      </div>

      {error && <div className="text-sm text-[var(--danger)]">{error}</div>}
    </div>
  );
}
