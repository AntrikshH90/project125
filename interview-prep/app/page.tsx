import Link from "next/link";
import { Brain, Building2, Sparkles, Users, BarChart3, ArrowRight, Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, getCurrentTeam } from "@/lib/session";

export default async function HomePage() {
  await getOrCreateUser();
  const team = await getCurrentTeam();

  const [totalQ, byCat, byCompany, recentAttempts] = await Promise.all([
    prisma.question.count(),
    prisma.question.groupBy({ by: ["category"], _count: true }),
    prisma.question.groupBy({
      by: ["company"],
      where: { company: { not: null } },
      _count: true,
    }),
    prisma.attempt.findMany({
      take: 5,
      orderBy: { startedAt: "desc" },
      include: { user: true },
    }),
  ]);

  const totalAttempts = await prisma.attempt.count();
  const avgPct = await prisma.attempt
    .aggregate({
      _avg: { score: true },
    })
    .then((r) => (r._avg.score ?? 0).toFixed(1));

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center space-y-4 pt-6">
        <div className="inline-block chip chip-accent">
          <Target size={12} />
          Mock interviews for your whole team
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Prep for your next round with{" "}
          <span className="gradient-text">real past questions</span>
        </h1>
        <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto text-lg">
          MCQ practice across aptitude, technical, and HR. Company-tagged questions
          reported by candidates. A prediction engine surfaces what's{" "}
          <em>most likely</em> to be asked next.
        </p>
        <div className="flex gap-3 justify-center pt-2 flex-wrap">
          <Link href="/test" className="btn btn-primary">
            Start MCQ test <ArrowRight size={14} />
          </Link>
          <Link href="/predicted" className="btn btn-secondary">
            See predicted questions
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Questions" value={totalQ} />
        <Stat label="Companies" value={byCompany.length} />
        <Stat label="Total attempts" value={totalAttempts} />
        <Stat label="Avg score" value={avgPct} />
      </section>

      {/* Cards */}
      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FeatureCard
          href="/test"
          icon={<Brain size={20} />}
          title="MCQ Test Engine"
          description={`Aptitude, technical, and HR questions with timer, instant scoring, and explanations. ${byCat.length} categories.`}
          cta="Take a test"
        />
        <FeatureCard
          href="/company"
          icon={<Building2 size={20} />}
          title="Company Banks"
          description="Real questions reported by candidates at Google, Microsoft, Amazon, Meta, and NVIDIA — tagged by role and recency."
          cta="Browse companies"
        />
        <FeatureCard
          href="/predicted"
          icon={<Sparkles size={20} />}
          title="Predicted Questions"
          description="Our engine scores every question by popularity, recency, and topic heat to predict what's likely asked next cycle."
          cta="See predictions"
        />
        <FeatureCard
          href="/team"
          icon={<Users size={20} />}
          title="Team Mode"
          description="Create or join a team. Compete on the leaderboard, share progress, and run practice rounds together."
          cta={team ? "View team" : "Create team"}
        />
        <FeatureCard
          href="/analytics"
          icon={<BarChart3 size={20} />}
          title="Your Analytics"
          description="Track accuracy by topic, time-per-question trends, weak areas to focus on, and how your team compares."
          cta="Open analytics"
        />
        <div className="card p-5 space-y-3">
          <div className="text-sm text-[var(--muted-foreground)]">Recent attempts</div>
          {recentAttempts.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)]">
              No attempts yet. Take a test to get started.
            </div>
          ) : (
            <ul className="space-y-2">
              {recentAttempts.map((a) => {
                const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
                return (
                  <li
                    key={a.id}
                    className="flex justify-between text-sm border-b border-[var(--border)] pb-1.5"
                  >
                    <span>
                      {a.user.name} · {a.mode}
                    </span>
                    <span className="text-[var(--muted-foreground)]">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Companies */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Question banks by company</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {byCompany
            .sort((a, b) => b._count - a._count)
            .map((c) =>
              c.company ? (
                <Link
                  key={c.company}
                  href={`/company/${c.company}`}
                  className={`card p-4 text-center hover:scale-[1.02] transition`}
                >
                  <div
                    className={`chip company-${c.company} mx-auto mb-2`}
                  >
                    {c.company}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {c._count} questions
                  </div>
                </Link>
              ) : null,
            )}
        </div>
      </section>
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

function FeatureCard({
  href,
  icon,
  title,
  description,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link href={href} className="card p-5 block">
      <div className="flex items-center gap-2 mb-2 text-[var(--accent)]">
        {icon}
        <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
      </div>
      <p className="text-sm text-[var(--muted-foreground)] mb-3">{description}</p>
      <span className="text-xs text-[var(--accent)] flex items-center gap-1">
        {cta} <ArrowRight size={12} />
      </span>
    </Link>
  );
}
