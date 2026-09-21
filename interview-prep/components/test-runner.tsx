"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, ChevronRight, ChevronLeft, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export type TestQuestion = {
  id: string;
  prompt: string;
  options: string[];
  subTopic: string;
  difficulty: string;
  company: string | null;
  role: string | null;
};

export type TestMeta = {
  mode: "mcq" | "company" | "predicted";
  title: string;
  description?: string;
  totalSeconds: number;
  submitUrl: string;
};

export function TestRunner({
  questions,
  meta,
}: {
  questions: TestQuestion[];
  meta: TestMeta;
}) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(meta.totalSeconds);
  const [startTs] = useState(() => Date.now());
  const [perQStart, setPerQStart] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    score: number;
    total: number;
    correct: Record<string, number>;
    explanations: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    if (submitted) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, submitted]);

  useEffect(() => {
    setPerQStart((m) => ({ ...m, [questions[idx]?.id]: Date.now() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const q = questions[idx];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  function pickOption(optIdx: number) {
    setAnswers((a) => ({ ...a, [q.id]: optIdx }));
  }

  async function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    const timePerQ: Record<string, number> = {};
    for (const qu of questions) {
      const started = perQStart[qu.id] ?? startTs;
      timePerQ[qu.id] = Math.max(0, Date.now() - started);
    }
    const payload = {
      mode: meta.mode,
      answers,
      timePerQ,
      questionIds: questions.map((q) => q.id),
      durationSec: Math.floor((Date.now() - startTs) / 1000),
    };
    const res = await fetch(meta.submitUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setResult(data);
  }

  if (result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div className="space-y-6">
        <div className="card p-8 text-center">
          <div className="text-5xl font-bold gradient-text mb-2">{pct}%</div>
          <div className="text-lg text-[var(--muted-foreground)]">
            {result.score} of {result.total} correct
          </div>
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            <button
              className="btn btn-primary"
              onClick={() => router.push("/analytics")}
            >
              See analytics
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => router.push("/")}
            >
              Home
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Review</h2>
          {questions.map((qu, i) => {
            const correct = result.correct[qu.id];
            const chosen = answers[qu.id];
            const isCorrect = chosen === correct;
            return (
              <div key={qu.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isCorrect ? (
                      <CheckCircle2 size={18} className="text-[var(--success)]" />
                    ) : (
                      <XCircle size={18} className="text-[var(--danger)]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-[var(--muted-foreground)] mb-1">
                      Q{i + 1} · {qu.subTopic} · {qu.difficulty}
                      {qu.company ? ` · ${qu.company}` : ""}
                    </div>
                    <div className="font-medium mb-2">{qu.prompt}</div>
                    <div className="text-sm space-y-1">
                      {qu.options.map((opt, j) => {
                        const isAnswer = j === correct;
                        const isChosen = j === chosen;
                        return (
                          <div
                            key={j}
                            className={cn(
                              "px-3 py-1.5 rounded-md border",
                              isAnswer && "border-[var(--success)] bg-emerald-500/10 text-emerald-300",
                              !isAnswer && isChosen && "border-[var(--danger)] bg-red-500/10 text-red-300",
                              !isAnswer && !isChosen && "border-[var(--border)] text-[var(--muted-foreground)]",
                            )}
                          >
                            {opt}
                            {isAnswer && " ✓ correct"}
                            {isChosen && !isAnswer && " (your answer)"}
                          </div>
                        );
                      })}
                    </div>
                    {result.explanations[qu.id] && (
                      <div className="mt-2 text-xs text-[var(--muted-foreground)] bg-[var(--muted)] p-2 rounded">
                        {result.explanations[qu.id]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!q) return <div>No questions to display.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{meta.title}</h1>
          {meta.description && (
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{meta.description}</p>
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-2 chip",
            timeLeft < 60 ? "chip-danger" : "chip-warning",
          )}
        >
          <Clock size={12} />
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={cn(
              "w-7 h-7 rounded text-xs font-medium border transition",
              i === idx
                ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                : answers[questions[i].id] !== undefined
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]",
            )}
            title={`Q${i + 1}${answers[questions[i].id] !== undefined ? " · answered" : ""}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3 text-xs text-[var(--muted-foreground)]">
          <span className="chip">{q.subTopic}</span>
          <span className="chip">{q.difficulty}</span>
          {q.company && <span className={`chip company-${q.company}`}>{q.company}</span>}
          {q.role && <span className="chip">{q.role}</span>}
        </div>
        <h2 className="text-lg font-semibold leading-relaxed mb-5">{q.prompt}</h2>
        <div className="space-y-2">
          {q.options.map((opt, j) => {
            const picked = answers[q.id] === j;
            return (
              <button
                key={j}
                onClick={() => pickOption(j)}
                className={cn(
                  "w-full text-left p-3.5 rounded-lg border transition",
                  picked
                    ? "border-[var(--accent)] bg-indigo-500/10"
                    : "border-[var(--border)] bg-[var(--muted)] hover:border-[var(--accent)]",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border",
                      picked
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)]",
                    )}
                  >
                    {String.fromCharCode(65 + j)}
                  </span>
                  <span>{opt}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-between">
        <button
          className="btn btn-secondary"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <Flag size={12} />
          {Object.keys(answers).length}/{questions.length} answered
        </div>
        {idx === questions.length - 1 ? (
          <button
            className="btn btn-primary"
            disabled={isPending}
            onClick={() => startTransition(() => handleSubmit())}
          >
            Submit test
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setIdx((i) => i + 1)}>
            Next <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
