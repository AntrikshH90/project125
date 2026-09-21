import { prisma } from "@/lib/prisma";
import { TestRunner, type TestQuestion } from "@/components/test-runner";

export default async function TestRunPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; difficulty?: string; count?: string }>;
}) {
  const sp = await searchParams;
  const category = sp.category ?? "mixed";
  const difficulty = sp.difficulty ?? "any";
  const count = Math.min(20, Math.max(1, Number(sp.count ?? 10)));

  const where: Parameters<typeof prisma.question.findMany>[0] = {
    where: {},
    orderBy: { id: "asc" },
    take: count,
  };
  if (category !== "mixed") (where.where as Record<string, unknown>).category = category;
  if (difficulty !== "any")
    (where.where as Record<string, unknown>).difficulty = difficulty;

  const raw = await prisma.question.findMany(where);

  const questions: TestQuestion[] = raw
    .map((q) => {
      let options: string[] = [];
      try {
        options = JSON.parse(q.options);
      } catch {
        options = [];
      }
      return {
        id: q.id,
        prompt: q.prompt,
        options,
        subTopic: q.subTopic,
        difficulty: q.difficulty,
        company: q.company,
        role: q.role,
      };
    })
    .sort(() => Math.random() - 0.5);

  if (questions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p>No questions match those filters. Try different settings.</p>
      </div>
    );
  }

  return (
    <TestRunner
      questions={questions}
      meta={{
        mode: "mcq",
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} MCQ Test`,
        description: `${questions.length} questions · ${difficulty} difficulty · timed`,
        totalSeconds: questions.length * 60,
        submitUrl: "/api/submit",
      }}
    />
  );
}
