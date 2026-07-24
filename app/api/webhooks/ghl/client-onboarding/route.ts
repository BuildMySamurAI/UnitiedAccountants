import { NextRequest, NextResponse } from "next/server";
import { provisionPortalForOpportunity } from "@/lib/onboarding";

// Point a GHL workflow ("Opportunity Created" or "Pipeline Stage Changed",
// filtered to New Corporation Onboarding / Client Onboarding) at this URL
// with ?secret=<GHL_WEBHOOK_SECRET> to cover opportunities created/moved
// directly in GHL, outside the /onboard form.
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.GHL_WEBHOOK_SECRET || secret !== process.env.GHL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const opportunityId = body?.opportunity?.id ?? body?.id;
  if (!opportunityId) {
    return NextResponse.json({ error: "missing opportunity id" }, { status: 400 });
  }

  try {
    const result = await provisionPortalForOpportunity(opportunityId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
