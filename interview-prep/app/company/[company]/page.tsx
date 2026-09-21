import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Calendar, Repeat, ExternalLink, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getTopTopics } from "@/lib/predictions";

function daysAgo(d: Date | null) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { company } = await params;
  const sp = await searchParams;
  const companyLc = company.toLowerCase();

  const [allQuestions, roles, topics] = await Promise.all([
    prisma.question.findMany({
      where: { company: companyLc },
      orderBy: { lastReported: "desc" },
    }),
    prisma.question.groupBy({
      by: ["role"],
      where: { company: companyLc, role: { not: null } },
      _count: true,
    }),
    getTopTopics(companyLc),
  ]);

  if (allQuestions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p>No questions found for {company}.</p>
        <Link href="/company" className="btn btn-secondary mt-3 inline-flex">
          Back
        </Link>
      </div>
    );
  }

  const roleFilter = sp.role ?? null;
  const filtered = roleFilter
    ? allQuestions.filter((q) => q.role === roleFilter)
    : allQuestions;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={20} className="text-[var(--accent)]" />
            <h1 className="text-2xl font-bold capitalize">
              {company}{" "}
              <span className={`chip company-${companyLc} align-middle`}>
                {allQuestions.length} questions
              </span>
            </h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Reported by candidates via Glassdoor, LeetCode, Reddit, and LinkedIn.
          </p>
        </div>
        <Link
          href={`/predicted?company=${companyLc}`}
          className="btn btn-primary"
        >
          See predicted questions <ArrowRight size={14} />
        </Link>
      </header>

      {/* Hot topics */}
      <section className="card p-4">
        <div className="text-xs text-[var(--muted-foreground)] mb-2 uppercase tracking-wide">
          Hot topics (last 18 months)
        </div>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <span
              key={t.subTopic}
              className="chip chip-accent"
              title={`${t.reports} candidate reports`}
            >
              {t.subTopic} · {t.reports}×
            </span>
          ))}
        </div>
      </section>

      {/* Role filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[var(--muted-foreground)]">Filter by role:</span>
        <Link
          href={`/company/${companyLc}`}
          className={`chip ${!roleFilter ? "chip-accent" : ""}`}
        >
          All
        </Link>
        {roles
          .filter((r) => r.role)
          .map((r) => (
            <Link
              key={r.role!}
              href={`/company/${companyLc}?role=${encodeURIComponent(r.role!)}`}
              className={`chip ${roleFilter === r.role ? "chip-accent" : ""}`}
            >
              {r.role} · {r._count}
            </Link>
          ))}
      </div>

      {/* Questions list */}
      <section className="space-y-3">
        {filtered.map((q, i) => {
          let options: string[] = [];
          try {
            options = JSON.parse(q.options);
          } catch {
            options = [];
          }
          return (
            <div key={q.id} className="card p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap text-xs">
                <span className="chip">{q.subTopic}</span>
                <span className="chip">{q.difficulty}</span>
                {q.role && <span className="chip">{q.role}</span>}
                {q.askedYear && (
                  <span className="chip">
                    <Calendar size={10} /> last asked {q.askedYear}
                  </span>
                )}
                <span className="chip chip-warning">
                  <Repeat size={10} /> reported {q.timesReported}× · {daysAgo(q.lastReported)}
                </span>
                {q.source && (
                  <span className="chip">
                    <ExternalLink size={10} /> {q.source}
                  </span>
                )}
              </div>
              <div className="font-medium mb-3">{q.prompt}</div>
              <details className="text-sm">
                <summary className="cursor-pointer text-[var(--accent)] select-none">
                  Show answer + explanation
                </summary>
                <div className="mt-3 space-y-1">
                  {options.map((opt, j) => (
                    <div
                      key={j}
                      className={`px-3 py-1.5 rounded border ${
                        j === q.correctIdx
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-[var(--border)] text-[var(--muted-foreground)]"
                      }`}
                    >
                      {opt}
                      {j === q.correctIdx && " ✓"}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {q.explanation}
                </p>
              </details>
            </div>
          );
        })}
      </section>
    </div>
  );
}
