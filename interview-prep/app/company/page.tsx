import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function CompanyIndexPage() {
  const companies = await prisma.question.groupBy({
    by: ["company"],
    where: { company: { not: null } },
    _count: true,
  });

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={20} className="text-[var(--accent)]" />
          <h1 className="text-2xl font-bold">Company question banks</h1>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Real questions reported by candidates, tagged by company and role.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {companies
          .filter((c) => c.company)
          .sort((a, b) => b._count - a._count)
          .map((c) => (
            <Link
              key={c.company!}
              href={`/company/${c.company!}`}
              className="card p-5 block"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`chip company-${c.company!}`}>{c.company}</div>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {c._count} questions
                </span>
              </div>
              <div className="text-sm text-[var(--muted-foreground)]">
                View all tagged questions
              </div>
              <div className="text-xs text-[var(--accent)] mt-2 flex items-center gap-1">
                Open <ArrowRight size={12} />
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
