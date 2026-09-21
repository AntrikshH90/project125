"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Brain, ArrowRight, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "aptitude", label: "Aptitude", desc: "Probability, time-speed-distance, ratios, profit/loss" },
  { id: "technical", label: "Technical", desc: "DSA, OS, DBMS, networks, system design, ML" },
  { id: "hr", label: "HR / Behavioral", desc: "STAR stories, situational, culture fit" },
  { id: "mixed", label: "Mixed", desc: "Sample across all three categories" },
];

const DIFFICULTIES = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
  { id: "any", label: "Any" },
];

const COUNTS = [5, 10, 15, 20];

export function TestConfig() {
  const router = useRouter();
  const [category, setCategory] = useState("mixed");
  const [difficulty, setDifficulty] = useState("any");
  const [count, setCount] = useState(10);
  const [isPending, startTransition] = useTransition();

  function start() {
    const params = new URLSearchParams({
      category,
      difficulty,
      count: String(count),
    });
    startTransition(() => {
      router.push(`/test/run?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Brain size={20} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold">Configure your MCQ test</h1>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Pick a category, difficulty, and question count. Timed, scored, with explanations.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold mb-3 text-[var(--muted-foreground)] uppercase tracking-wide">
          Category
        </h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "text-left p-3.5 rounded-lg border transition",
                category === c.id
                  ? "border-[var(--accent)] bg-indigo-500/10"
                  : "border-[var(--border)] bg-[var(--muted)] hover:border-[var(--accent)]",
              )}
            >
              <div className="font-medium">{c.label}</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                {c.desc}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3 text-[var(--muted-foreground)] uppercase tracking-wide">
          Difficulty
        </h2>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm transition",
                difficulty === d.id
                  ? "border-[var(--accent)] bg-indigo-500/10 text-white"
                  : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3 text-[var(--muted-foreground)] uppercase tracking-wide">
          Question count
        </h2>
        <div className="flex flex-wrap gap-2">
          {COUNTS.map((c) => (
            <button
              key={c}
              onClick={() => setCount(c)}
              className={cn(
                "w-14 h-10 rounded-lg border text-sm font-medium transition",
                count === c
                  ? "border-[var(--accent)] bg-indigo-500/10 text-white"
                  : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={start}
        disabled={isPending}
        className="btn btn-primary w-full sm:w-auto"
      >
        <Settings2 size={14} />
        Start test
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
