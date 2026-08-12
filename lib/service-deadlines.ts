import type { ServiceTypeKey } from "./services";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Suggested default deadline shown when staff add a service - editable, not
// enforced. Only Corporation Renewal (fixed Apr 30 every year, per the
// client's notes) and Sales Tax Certificate (renews by year-end) have a
// sensible default; DBPR licenses and Food Permits vary per client, so
// there's nothing to suggest - staff enter those by hand.
//
// Returns a plain "YYYY-MM-DD" string built from local calendar fields
// directly (no Date -> toISOString round trip) - that round trip re-encodes
// a local midnight as UTC, which silently shifts the date backward a day
// for any browser running in a timezone ahead of UTC.
export function suggestedServiceDeadline(serviceType: ServiceTypeKey, now: Date = new Date()): string | null {
  let month: number, day: number;

  if (serviceType === "corp_renewal") {
    [month, day] = [4, 30];
  } else if (serviceType === "sales_tax_cert") {
    [month, day] = [12, 31];
  } else {
    return null;
  }

  let year = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const passed = nowMonth > month || (nowMonth === month && now.getDate() > day);
  if (passed) year += 1;

  return `${year}-${pad(month)}-${pad(day)}`;
}
