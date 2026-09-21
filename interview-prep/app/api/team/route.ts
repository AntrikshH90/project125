import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createTeam, joinTeam, setUserName } from "@/lib/session";

const Schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().min(1).max(40),
    userName: z.string().min(1).max(40),
  }),
  z.object({
    action: z.literal("join"),
    code: z.string().min(4).max(10),
    userName: z.string().min(1).max(40),
  }),
]);

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;
  await setUserName(data.userName);

  if (data.action === "create") {
    const team = await createTeam(data.name);
    return NextResponse.json({ team: { code: team.code, name: team.name } });
  }
  const team = await joinTeam(data.code.toUpperCase());
  if (!team) {
    return NextResponse.json({ error: "Team code not found" }, { status: 404 });
  }
  return NextResponse.json({ team: { code: team.code, name: team.name } });
}
