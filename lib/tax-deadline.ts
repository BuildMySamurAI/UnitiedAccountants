// Income tax deadline for a company, derived from Entity Type + Extension
// Filed + Filed? status - no stored date field needed. "Extension Filed"
// and "Filed?" both reset to "No" every January 1st (see
// lib/tax-extension-reset.ts), so within a given year the applicable date
// only ever moves forward once (No -> Yes on the extension), and rolls to
// next year's date once the current one has passed - but only once the
// return has actually been filed. An unfiled return past its deadline stays
// put and is reported overdue, rather than silently rolling forward next
// year as if nothing were wrong.
export type IncomeTaxDeadlineResult = { date: Date; overdue: boolean };

export function incomeTaxDeadline(
  entityType: string | undefined,
  extensionFiled: string | undefined,
  filed: string | undefined,
  now: Date = new Date()
): IncomeTaxDeadlineResult | null {
  let baseMonth: number, baseDay: number, extendedMonth: number, extendedDay: number;

  if (entityType === "S-Corp" || entityType === "Partnership") {
    [baseMonth, baseDay] = [3, 15];
    [extendedMonth, extendedDay] = [9, 15];
  } else if (entityType === "C-Corp" || entityType === "Individual") {
    [baseMonth, baseDay] = [4, 15];
    [extendedMonth, extendedDay] = [10, 15];
  } else {
    return null;
  }

  const extended = extensionFiled === "Yes";
  const [month, day] = extended ? [extendedMonth, extendedDay] : [baseMonth, baseDay];
  const year = now.getFullYear();
  const deadline = new Date(year, month - 1, day);

  if (deadline >= now) return { date: deadline, overdue: false };

  // This year's applicable deadline has passed. Filed clears it and rolls
  // the calendar to next year's un-extended date - "Extension Filed" resets
  // to No every January, so a new cycle always starts against the base
  // date. Still unfiled means overdue, not upcoming.
  if (filed === "Yes") {
    return { date: new Date(year + 1, baseMonth - 1, baseDay), overdue: false };
  }
  return { date: deadline, overdue: true };
}
