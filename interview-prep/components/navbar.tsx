import Link from "next/link";
import { Brain, Home, Building2, Sparkles, BarChart3, Users } from "lucide-react";
import type { User, Team } from "@prisma/client";

export function Navbar({
  user,
  team,
}: {
  user: User;
  team: Team | null;
}) {
  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/test", label: "MCQ Test", icon: Brain },
    { href: "/company", label: "Companies", icon: Building2 },
    { href: "/predicted", label: "Predicted", icon: Sparkles },
    { href: "/leaderboard", label: "Team", icon: Users },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
            P
          </div>
          <span>PrepDeck</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition"
              >
                <Icon size={14} />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {team ? (
            <span className="chip chip-accent" title={`Team: ${team.name}`}>
              <Users size={12} />
              {team.name} · {team.code}
            </span>
          ) : (
            <Link href="/team" className="chip chip-accent">
              <Users size={12} />
              Join team
            </Link>
          )}
          <span className="text-sm text-[var(--muted-foreground)] hidden sm:inline">
            {user.name}
          </span>
        </div>
      </div>
    </header>
  );
}
