import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";
import { AnalyticsCharts } from "@/components/analytics-charts";

export default async function AnalyticsPage() {
  const user = await getOrCreateUser();

  const [attempts, totalQ] = await Promise.all([
    prisma.attempt.findMany({
      where: { userId: user.id },
      include: { answers: { include: { question: true } } },
      orderBy: { startedAt: "asc" },
    }),
    prisma.question.count(),
  ]);

  // accuracy by subTopic
  const topicMap: Record<string, { right: number; total: number }> = {};
  let totalAnswered = 0;
  let totalCorrect = 0;
  for (const a of attempts) {
    for (const ans of a.answers) {
      const t = ans.question.subTopic;
      if (!topicMap[t]) topicMap[t] = { right: 0, total: 0 };
      topicMap[t].total += 1;
      if (ans.isCorrect) topicMap[t].right += 1;
      totalAnswered += 1;
      if (ans.isCorrect) totalCorrect += 1;
    }
  }

  const byTopic = Object.entries(topicMap)
    .map(([topic, v]) => ({
      topic,
      right: v.right,
      total: v.total,
      pct: v.total ? Math.round((v.right / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  // trend per attempt
  const trend = attempts.map((a) => ({
    date: new Date(a.startedAt).toLocaleDateString(),
    pct: a.total ? Math.round((a.score / a.total) * 100) : 0,
    score: a.score,
    total: a.total,
    mode: a.mode,
  }));

  const weak = [...byTopic]
    .filter((t) => t.total >= 2)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 size={20} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold">Your analytics</h1>
        </div>
      </header>

      {attempts.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-[var(--muted-foreground)]">
            No attempts yet. Take a test to start seeing your analytics.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Attempts" value={attempts.length} />
            <Stat label="Answered" value={totalAnswered} />
            <Stat
              label="Overall accuracy"
              value={
                totalAnswered
                  ? `${Math.round((totalCorrect / totalAnswered) * 100)}%`
                  : "—"
              }
            />
            <Stat
              label="Best run"
              value={`${
                attempts.reduce(
                  (m, a) =>
                    Math.max(m, a.total ? (a.score / a.total) * 100 : 0),
                  0,
                ) | 0
              }%`}
            />
          </section>

          <AnalyticsCharts trend={trend} byTopic={byTopic} />

          {weak.length > 0 && (
            <section className="card p-4">
              <h2 className="font-semibold mb-2">Focus areas</h2>
              <p className="text-xs text-[var(--muted-foreground)] mb-3">
                These topics have the lowest accuracy (with ≥ 2 answers).
              </p>
              <div className="flex flex-wrap gap-2">
                {weak.map((w) => (
                  <span key={w.topic} className="chip chip-danger">
                    {w.topic} · {w.pct}% ({w.right}/{w.total})
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-[var(--muted-foreground)] mt-1">{label}</div>
    </div>
  );
}
