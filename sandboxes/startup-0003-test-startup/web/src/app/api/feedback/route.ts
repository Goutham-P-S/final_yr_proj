import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ ok: true, feedback: items });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const message = body?.message;
  const page = body?.page ?? null;

  if (!message || typeof message !== "string" || message.trim().length < 2) {
    return NextResponse.json({ ok: false, error: "message required" }, { status: 400 });
  }

  const saved = await prisma.feedback.create({
    data: { message: message.trim(), page },
  });

  return NextResponse.json({ ok: true, feedback: saved });
}
