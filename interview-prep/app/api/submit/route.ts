import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, getCurrentTeam } from "@/lib/session";

const Schema = z.object({
  mode: z.enum(["mcq", "company", "predicted"]),
  answers: z.record(z.string(), z.number()),
  timePerQ: z.record(z.string(), z.number()),
  questionIds: z.array(z.string()),
  durationSec: z.number().int().nonnegative(),
  company: z.string().optional(),
  role: z.string().optional(),
  category: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { mode, answers, timePerQ, questionIds, durationSec, company, role, category } =
    parsed.data;

  const user = await getOrCreateUser();
  const team = await getCurrentTeam();

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
  });

  let score = 0;
  const correctMap: Record<string, number> = {};
  const explanations: Record<string, string> = {};

  const answerRows = questions.map((q) => {
    const selected = answers[q.id] ?? -1;
    const isCorrect = selected === q.correctIdx;
    if (isCorrect) score++;
    correctMap[q.id] = q.correctIdx;
    explanations[q.id] = q.explanation;
    return {
      questionId: q.id,
      selectedIdx: selected,
      isCorrect,
      timeSpentMs: timePerQ[q.id] ?? 0,
    };
  });

  const attempt = await prisma.attempt.create({
    data: {
      userId: user.id,
      teamId: team?.id,
      mode,
      company: company ?? null,
      role: role ?? null,
      category: category ?? null,
      score,
      total: questions.length,
      durationSec,
      finishedAt: new Date(),
      answers: { create: answerRows },
    },
  });

  // Bump times-reported on the questions (signals the model — we are using the
  // system, that's organic signal that these questions are being practiced)
  for (const q of questions) {
    if (q.company) {
      await prisma.question.update({
        where: { id: q.id },
        data: { timesReported: { increment: 1 }, lastReported: new Date() },
      });
    }
  }

  return NextResponse.json({
    attemptId: attempt.id,
    score,
    total: questions.length,
    correct: correctMap,
    explanations,
  });
}
