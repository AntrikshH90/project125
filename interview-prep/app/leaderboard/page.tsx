import { Trophy, Users, Medal } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentTeam } from "@/lib/session";

export default async function LeaderboardPage() {
  const team = await getCurrentTeam();

  let board: {
    name: string;
    attempts: number;
    avgPct: number;
    totalScore: number;
  }[] = [];

  if (team) {
    const users = await prisma.user.findMany({
      where: { teamId: team.id },
      include: { attempts: true },
    });
    board = users
      .map((u) => {
        const totalAttempts = u.attempts.length;
        const sumPct = u.attempts.reduce(
          (s, a) => s + (a.total ? (a.score / a.total) * 100 : 0),
          0,
        );
        const totalScore = u.attempts.reduce((s, a) => s + a.score, 0);
        const avgPct = totalAttempts ? sumPct / totalAttempts : 0;
        return {
          name: u.name,
          attempts: totalAttempts,
          avgPct: Math.round(avgPct),
          totalScore,
        };
      })
      .sort((a, b) => b.avgPct - a.avgPct || b.totalScore - a.totalScore);
  }

  // Global leaderboard across all teams
  const global = await prisma.attempt.findMany({
    include: { user: true, team: true },
    orderBy: { score: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={20} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold">Leaderboard</h1>
        </div>
      </header>

      {!team && (
        <div className="card p-5 text-sm text-[var(--muted-foreground)]">
          <Users size={14} className="inline mr-1" />
          Join or create a team from the{" "}
          <a className="text-[var(--accent)]" href="/team">Team page</a> to see your team's
          board.
        </div>
      )}

      {team && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Your team · {team.name}</h2>
          {board.length === 0 ? (
            <div className="card p-5 text-sm text-[var(--muted-foreground)]">
              No attempts yet from your team. Take a test!
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)]">
                  <tr>
                    <th className="text-left p-3">Rank</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-right p-3">Attempts</th>
                    <th className="text-right p-3">Avg score</th>
                    <th className="text-right p-3">Total points</th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((m, i) => (
                    <tr key={i} className="border-t border-[var(--border)]">
                      <td className="p-3">
                        {i === 0 ? (
                          <Medal size={14} className="inline text-yellow-400" />
                        ) : (
                          `#${i + 1}`
                        )}
                      </td>
                      <td className="p-3 font-medium">{m.name}</td>
                      <td className="p-3 text-right">{m.attempts}</td>
                      <td className="p-3 text-right">{m.avgPct}%</td>
                      <td className="p-3 text-right">{m.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Top runs (global)</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="text-left p-3">Score</th>
                <th className="text-left p-3">%</th>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Mode</th>
                <th className="text-left p-3">Company</th>
                <th className="text-left p-3">When</th>
              </tr>
            </thead>
            <tbody>
              {global.map((a) => (
                <tr key={a.id} className="border-t border-[var(--border)]">
                  <td className="p-3 font-mono">
                    {a.score}/{a.total}
                  </td>
                  <td className="p-3">
                    {a.total ? Math.round((a.score / a.total) * 100) : 0}%
                  </td>
                  <td className="p-3">{a.user.name}</td>
                  <td className="p-3">
                    <span className="chip">{a.mode}</span>
                  </td>
                  <td className="p-3">
                    {a.company ? (
                      <span className={`chip company-${a.company}`}>{a.company}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-[var(--muted-foreground)]">
                    {new Date(a.startedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
