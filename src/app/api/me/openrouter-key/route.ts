import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { encryptApiKey } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (apiKey.length < 16) {
    return NextResponse.json({ error: "invalid api key" }, { status: 400 });
  }

  const blob = encryptApiKey(apiKey);
  await prisma.user.update({
    where: { id: user.id },
    data: { openrouterKeyEncrypted: blob },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  await prisma.user.update({
    where: { id: user.id },
    data: { openrouterKeyEncrypted: null },
  });
  return NextResponse.json({ ok: true });
}
