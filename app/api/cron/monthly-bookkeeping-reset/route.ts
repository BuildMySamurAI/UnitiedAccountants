import { NextRequest, NextResponse } from "next/server";
import { runMonthlyBookkeepingReset } from "@/lib/monthly-bookkeeping-reset";

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET` when the
// CRON_SECRET env var is set - see vercel.json for the schedule.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMonthlyBookkeepingReset();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
