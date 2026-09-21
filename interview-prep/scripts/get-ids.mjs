import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const qs = await p.question.findMany({ take: 3 });
console.log(JSON.stringify(qs.map(q => ({ id: q.id, correctIdx: q.correctIdx, correct: JSON.parse(q.options)[q.correctIdx] }))));
await p.$disconnect();
