import { getAllOpportunitiesInPipeline, getOpportunity, updateOpportunityCustomFields } from "@/lib/ghl/client";
import { customFieldValue } from "@/lib/ghl/fields";
import { OPPORTUNITY_FIELDS, PIPELINE_NEW_CORP_ONBOARDING } from "@/lib/ghl/constants";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getInactiveCompanyOpportunityIds } from "@/lib/inactive-clients";

// All calendar math is done in UTC, treating these as pure dates with no
// time-of-day component (matching how GHL DATE fields behave).
function parseUTCDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUTCDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function lastDayOfMonth(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex + 1, 0));
}

function isLastDayOfMonth(date: Date): boolean {
  return date.getUTCDate() === lastDayOfMonth(date.getUTCFullYear(), date.getUTCMonth()).getUTCDate();
}

function addOneMonthPreservingEndOfMonth(date: Date): Date {
  const wasLastDay = isLastDayOfMonth(date);
  const targetMonthIndex = date.getUTCMonth() + 1;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;

  if (wasLastDay) {
    return lastDayOfMonth(targetYear, normalizedMonth);
  }

  const daysInTargetMonth = lastDayOfMonth(targetYear, normalizedMonth).getUTCDate();
  const clampedDay = Math.min(date.getUTCDate(), daysInTargetMonth);
  return new Date(Date.UTC(targetYear, normalizedMonth, clampedDay));
}

export function computeNextProcessingDate(currentDateStr: string, frequency: string): string {
  const current = parseUTCDate(currentDateStr);

  switch (frequency) {
    case "Weekly":
      return formatUTCDate(new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000));
    case "Bi-Weekly":
      return formatUTCDate(new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000));
    case "Monthly":
      return formatUTCDate(addOneMonthPreservingEndOfMonth(current));
    default:
      throw new Error(`Unknown Payroll Filing Frequency: "${frequency}"`);
  }
}

function isBeforeToday(dateStr: string): boolean {
  const today = parseUTCDate(new Date().toISOString());
  return parseUTCDate(dateStr).getTime() < today.getTime();
}

export type PayrollReminderResult = {
  scanned: number;
  updated: { opportunityId: string; name: string; from: string; to: string }[];
  skipped: { opportunityId: string; name: string; reason: string }[];
};

export async function runPayrollReminderJob(): Promise<PayrollReminderResult> {
  const [opportunities, inactiveOpportunityIds] = await Promise.all([
    getAllOpportunitiesInPipeline(PIPELINE_NEW_CORP_ONBOARDING),
    getInactiveCompanyOpportunityIds(),
  ]);

  const updated: PayrollReminderResult["updated"] = [];
  const skipped: PayrollReminderResult["skipped"] = [];

  for (const summary of opportunities) {
    if (inactiveOpportunityIds.has(summary.id)) continue;

    const opportunity = await getOpportunity(summary.id);
    if (customFieldValue(opportunity.customFields, OPPORTUNITY_FIELDS.payrollServiceEnabled) !== "Yes") continue;

    const processingDate = customFieldValue(opportunity.customFields, OPPORTUNITY_FIELDS.payrollProcessingDate);
    if (!processingDate) continue;
    if (!isBeforeToday(processingDate)) continue;

    const frequency = customFieldValue(opportunity.customFields, OPPORTUNITY_FIELDS.payrollFilingFrequency);
    if (!frequency) {
      skipped.push({ opportunityId: opportunity.id, name: opportunity.name, reason: "No Payroll Filing Frequency set" });
      continue;
    }

    let nextDate: string;
    try {
      nextDate = computeNextProcessingDate(processingDate, frequency);
    } catch (err) {
      skipped.push({
        opportunityId: opportunity.id,
        name: opportunity.name,
        reason: err instanceof Error ? err.message : "Unknown error computing next date",
      });
      continue;
    }

    await updateOpportunityCustomFields(opportunity.id, [
      { id: OPPORTUNITY_FIELDS.payrollProcessingDate, field_value: nextDate },
    ]);

    // Best-effort cache sync - the portal reads these fields live from GHL,
    // so this isn't load-bearing, just keeps companies.payroll_processing_date
    // consistent with everything else that field mirrors.
    await supabaseAdmin()
      .from("companies")
      .update({ payroll_processing_date: nextDate })
      .eq("ghl_opportunity_id", opportunity.id);

    updated.push({ opportunityId: opportunity.id, name: opportunity.name, from: processingDate, to: nextDate });
  }

  return { scanned: opportunities.length, updated, skipped };
}
