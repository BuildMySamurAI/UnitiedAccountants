import { getAllOpportunitiesInPipeline, updateOpportunityCustomFields } from "@/lib/ghl/client";
import { OPPORTUNITY_FIELDS, PIPELINE_NEW_CORP_ONBOARDING, STAGE_ACTIVE_CLIENT } from "@/lib/ghl/constants";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getInactiveCompanyOpportunityIds } from "@/lib/inactive-clients";

function currentMonthYYYYMM(): string {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}`;
}

export type MonthlyResetResult = {
  scanned: number;
  reset: { opportunityId: string; name: string }[];
};

// Runs on the 1st of every month - resets the monthly bookkeeping cycle
// fields for every opportunity currently in "Active Client" stage. Only
// touches these 5 fields; everything else on the opportunity is untouched.
// Clearing reconciliationCompletionDate re-opens the cycle for the new
// month (it's set = closed, same role the old monthLocked flag had).
export async function runMonthlyBookkeepingReset(): Promise<MonthlyResetResult> {
  const [opportunities, inactiveOpportunityIds] = await Promise.all([
    getAllOpportunitiesInPipeline(PIPELINE_NEW_CORP_ONBOARDING),
    getInactiveCompanyOpportunityIds(),
  ]);
  const activeClients = opportunities.filter((o) => o.pipelineStageId === STAGE_ACTIVE_CLIENT && !inactiveOpportunityIds.has(o.id));

  const currentMonth = currentMonthYYYYMM();
  const reset: MonthlyResetResult["reset"] = [];

  for (const opportunity of activeClients) {
    await updateOpportunityCustomFields(opportunity.id, [
      { id: OPPORTUNITY_FIELDS.bookkeepingStatus, field_value: "Statements Pending" },
      { id: OPPORTUNITY_FIELDS.currentMonth, field_value: currentMonth },
      { id: OPPORTUNITY_FIELDS.statementsReceived, field_value: "No" },
      { id: OPPORTUNITY_FIELDS.reconciliationDifference, field_value: "" },
      { id: OPPORTUNITY_FIELDS.reconciliationCompletionDate, field_value: "" },
    ]);

    // Best-effort cache sync, same as everywhere else these fields mirror.
    await supabaseAdmin()
      .from("companies")
      .update({
        bookkeeping_status: "Statements Pending",
        current_month: currentMonth,
        statements_received: "No",
        reconciliation_difference: null,
        reconciliation_completion_date: null,
      })
      .eq("ghl_opportunity_id", opportunity.id);

    reset.push({ opportunityId: opportunity.id, name: opportunity.name });
  }

  return { scanned: opportunities.length, reset };
}
