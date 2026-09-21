import { prisma } from "./prisma";

/**
 * Prediction engine.
 *
 * Idea: a question's chance of being asked again is higher when
 *  - it has been reported by many candidates (popular)
 *  - it was asked recently and follows a recurring cycle
 *  - its topic has shown up across multiple recent attempts
 *  - difficulty matches the role's typical bar
 *
 * We compute a score 0..100 for every company/role pair and
 * return the top N questions ranked by that score.
 */

export type ScoredQuestion = {
  id: string;
  prompt: string;
  category: string;
  subTopic: string;
  difficulty: string;
  company: string | null;
  role: string | null;
  askedYear: number | null;
  timesReported: number;
  lastReported: Date | null;
  explanation: string;
  options: string[];
  correctIdx: number;
  predictionScore: number;
  reason: string;
};

function monthsAgo(d: Date | null): number {
  if (!d) return 999;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30);
}

export async function predictQuestionsFor(
  company: string,
  role?: string,
  limit = 20,
): Promise<ScoredQuestion[]> {
  const all = await prisma.question.findMany({
    where: { company: company.toLowerCase(), ...(role ? { role } : {}) },
  });

  if (all.length === 0) return [];

  // Topic frequency from the same company/role in the last 18 months
  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 18);
  const recent = all.filter((q) => q.lastReported && q.lastReported >= cutoff);
  const topicWeight: Record<string, number> = {};
  for (const q of recent) {
    topicWeight[q.subTopic] = (topicWeight[q.subTopic] ?? 0) + q.timesReported;
  }

  const scored: ScoredQuestion[] = all.map((q) => {
    let score = 50; // base
    const reasons: string[] = [];

    // 1) Popularity (saturating log)
    const pop = Math.log10(1 + q.timesReported) * 18;
    score += pop;
    if (q.timesReported >= 3) reasons.push(`reported ${q.timesReported}×`);

    // 2) Recency: asked in the last 6 months is a strong signal
    const m = monthsAgo(q.lastReported);
    if (m <= 6) {
      score += 25;
      reasons.push("asked this cycle");
    } else if (m <= 12) {
      score += 12;
      reasons.push("asked last cycle");
    } else if (m > 24) {
      score -= 15;
      reasons.push("stale (>2y)");
    }

    // 3) Topic heat for this company
    const tw = topicWeight[q.subTopic] ?? 0;
    if (tw >= 2) {
      score += 12;
      reasons.push("hot topic");
    }

    // 4) Difficulty: research-intern roles tend to favor medium/hard
    if (role?.toLowerCase().includes("research") && q.difficulty === "hard") {
      score += 5;
    }

    // 5) Rotation: if a question is older than 9 months and wasn't asked again,
    //    it can still be rotated back in (cycles in 12-18mo)
    if (m >= 9 && m <= 18) {
      score += 6;
      reasons.push("rotation window");
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    let opts: string[] = [];
    try {
      opts = JSON.parse(q.options);
    } catch {
      opts = [];
    }

    return {
      id: q.id,
      prompt: q.prompt,
      category: q.category,
      subTopic: q.subTopic,
      difficulty: q.difficulty,
      company: q.company,
      role: q.role,
      askedYear: q.askedYear,
      timesReported: q.timesReported,
      lastReported: q.lastReported,
      explanation: q.explanation,
      options: opts,
      correctIdx: q.correctIdx,
      predictionScore: score,
      reason: reasons.length ? reasons.join(" · ") : "topic coverage",
    };
  });

  scored.sort((a, b) => b.predictionScore - a.predictionScore);
  return scored.slice(0, limit);
}

export async function getCompanyHeatmap() {
  const companies = await prisma.question.groupBy({
    by: ["company"],
    where: { company: { not: null } },
    _count: true,
  });
  return companies
    .filter((c) => c.company)
    .map((c) => ({ company: c.company!, count: c._count }))
    .sort((a, b) => b.count - a.count);
}

export async function getTopTopics(company: string) {
  const grouped = await prisma.question.groupBy({
    by: ["subTopic"],
    where: { company },
    _count: true,
    _sum: { timesReported: true },
  });
  return grouped
    .map((g) => ({
      subTopic: g.subTopic,
      count: g._count,
      reports: g._sum.timesReported ?? 0,
    }))
    .sort((a, b) => b.reports - a.reports)
    .slice(0, 8);
}
