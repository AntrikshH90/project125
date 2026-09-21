import Link from "next/link";
import { Sparkles, ArrowRight, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { predictQuestionsFor } from "@/lib/predictions";

export default async function PredictedPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; role?: string }>;
}) {
  const sp = await searchParams;
  const company = (sp.company ?? "google").toLowerCase();
  const role = sp.role;

  const [companies, predicted] = await Promise.all([
    prisma.question.groupBy({
      by: ["company"],
      where: { company: { not: null } },
      _count: true,
    }),
    predictQuestionsFor(company, role, 15),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={20} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold">Predicted questions</h1>
        </div>
        <p className="text-sm text-[var(--muted-foreground)] max-w-2xl">
          Scored from 0–100 by recency, popularity, and topic heat. Higher score =
          more likely to be asked in the current cycle.
        </p>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[var(--muted-foreground)]">Company:</span>
        {companies
          .filter((c) => c.company)
          .sort((a, b) => b._count - a._count)
          .map((c) => (
            <Link
              key={c.company!}
              href={`/predicted?company=${c.company!}`}
              className={`chip ${c.company === company ? "chip-accent" : ""}`}
            >
              {c.company}
            </Link>
          ))}
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold capitalize">
            {company} {role ? `· ${role}` : ""}
          </h2>
          <Link
            href={`/test/run?category=technical&difficulty=any&count=10&from=predicted&company=${company}`}
            className="btn btn-primary text-sm"
          >
            Practice top 10 <ArrowRight size={12} />
          </Link>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          {predicted.length} questions ranked
        </p>
      </div>

      <section className="space-y-2">
        {predicted.length === 0 && (
          <div className="card p-6 text-center text-sm text-[var(--muted-foreground)]">
            No company-specific questions found. Try a different company.
          </div>
        )}
        {predicted.map((q, i) => {
          const color =
            q.predictionScore >= 80
              ? "chip-success"
              : q.predictionScore >= 60
                ? "chip-warning"
                : "chip-danger";
          return (
            <div key={q.id} className="card p-4 flex gap-4">
              <div className="flex-shrink-0 flex flex-col items-center justify-center w-14">
                <div className={`chip ${color} font-bold`}>{q.predictionScore}</div>
                <div className="text-[0.65rem] text-[var(--muted-foreground)] mt-0.5">
                  score
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap text-xs">
                  <span className="chip">#{i + 1}</span>
                  <span className="chip">{q.subTopic}</span>
                  <span className="chip">{q.difficulty}</span>
                  {q.role && <span className="chip">{q.role}</span>}
                  {q.askedYear && (
                    <span className="chip">last {q.askedYear}</span>
                  )}
                </div>
                <div className="font-medium mb-1">{q.prompt}</div>
                <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                  <TrendingUp size={10} /> {q.reason} · reported{" "}
                  {q.timesReported}×
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
