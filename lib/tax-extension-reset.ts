import { getAllOpportunitiesInPipeline, updateOpportunityCustomFields } from "@/lib/ghl/client";
import { OPPORTUNITY_FIELDS, PIPELINE_NEW_CORP_ONBOARDING, STAGE_ACTIVE_CLIENT } from "@/lib/ghl/constants";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getInactiveCompanyOpportunityIds } from "@/lib/inactive-clients";

export type ExtensionResetResult = {
  scanned: number;
  reset: { opportunityId: string; name: string }[];
};

// Runs once a year (called from the January run of the monthly-bookkeeping-
// reset cron, not its own cron entry) - flips "Extension Filed This Year?"
// back to "No" for every active client, so the new tax year starts against
// the March 15 / April 15 deadline again rather than carrying over last
// year's extension flag.
export async function runAnnualExtensionReset(): Promise<ExtensionResetResult> {
  const [opportunities, inactiveOpportunityIds] = await Promise.all([
    getAllOpportunitiesInPipeline(PIPELINE_NEW_CORP_ONBOARDING),
    getInactiveCompanyOpportunityIds(),
  ]);
  const activeClients = opportunities.filter((o) => o.pipelineStageId === STAGE_ACTIVE_CLIENT && !inactiveOpportunityIds.has(o.id));

  const reset: ExtensionResetResult["reset"] = [];

  for (const opportunity of activeClients) {
    await updateOpportunityCustomFields(opportunity.id, [
      { id: OPPORTUNITY_FIELDS.extensionFiled, field_value: "No" },
    ]);

    await supabaseAdmin()
      .from("companies")
      .update({ extension_filed: "No" })
      .eq("ghl_opportunity_id", opportunity.id);

    reset.push({ opportunityId: opportunity.id, name: opportunity.name });
  }

  return { scanned: opportunities.length, reset };
}
