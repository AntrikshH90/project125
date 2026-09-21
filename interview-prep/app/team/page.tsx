import { Users, ArrowRight } from "lucide-react";
import { getCurrentTeam } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TeamForm } from "@/components/team-form";

export default async function TeamPage() {
  const team = await getCurrentTeam();

  let members: { id: string; name: string }[] = [];
  if (team) {
    const ms = await prisma.user.findMany({
      where: { teamId: team.id },
      select: { id: true, name: true },
    });
    members = ms;
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Users size={20} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold">Team mode</h1>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Create or join a team to compete on the leaderboard and run shared practice rounds.
        </p>
      </header>

      {team ? (
        <div className="card p-5">
          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
            Your team
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-semibold">{team.name}</div>
              <div className="text-sm text-[var(--muted-foreground)]">
                Share this code to invite members
              </div>
            </div>
            <div className="chip chip-accent text-base font-mono px-3 py-1">
              {team.code}
            </div>
          </div>
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <div className="text-xs text-[var(--muted-foreground)] mb-2">
              Members ({members.length})
            </div>
            <ul className="space-y-1">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="text-sm py-1 border-b border-[var(--border)] last:border-0"
                >
                  {m.name}
                </li>
              ))}
            </ul>
          </div>
          <a href="/leaderboard" className="btn btn-primary mt-4 w-full">
            View leaderboard <ArrowRight size={14} />
          </a>
        </div>
      ) : (
        <TeamForm />
      )}
    </div>
  );
}
