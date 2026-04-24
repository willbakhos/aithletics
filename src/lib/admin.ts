import { NextResponse } from "next/server";

export interface AdminGate {
  ok: boolean;
  response?: NextResponse;
}

export function requireAdmin(req: Request): AdminGate {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "ADMIN_TOKEN is not configured" },
        { status: 503 },
      ),
    };
  }
  const provided = req.headers.get("x-admin-token");
  if (!provided || provided !== token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return { ok: true };
}
