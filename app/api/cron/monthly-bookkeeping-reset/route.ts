import { NextRequest, NextResponse } from "next/server";
import { runMonthlyBookkeepingReset } from "@/lib/monthly-bookkeeping-reset";
import { runAnnualExtensionReset } from "@/lib/tax-extension-reset";

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET` when the
// CRON_SECRET env var is set - see vercel.json for the schedule.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMonthlyBookkeepingReset();

    // Piggybacks on this same monthly cron rather than a separate Vercel
    // cron entry - only actually resets anything on the January run.
    const isJanuary = new Date().getUTCMonth() === 0;
    const extensionReset = isJanuary ? await runAnnualExtensionReset() : null;

    return NextResponse.json({ ok: true, ...result, extensionReset });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
