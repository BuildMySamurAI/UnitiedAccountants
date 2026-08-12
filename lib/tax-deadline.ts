// Income tax deadline for a company, derived purely from Entity Type +
// Extension Filed - no stored date field needed. "Extension Filed" resets to
// "No" every January 1st (see lib/tax-extension-reset.ts), so within a given
// year the applicable date only ever moves forward once (No -> Yes), and
// rolls to next year's date automatically once the current one has passed.
export function incomeTaxDeadline(
  entityType: string | undefined,
  extensionFiled: string | undefined,
  now: Date = new Date()
): Date | null {
  const extended = extensionFiled === "Yes";
  let month: number, day: number;

  if (entityType === "S-Corp" || entityType === "Partnership") {
    [month, day] = extended ? [9, 15] : [3, 15];
  } else if (entityType === "C-Corp" || entityType === "Individual") {
    [month, day] = extended ? [10, 15] : [4, 15];
  } else {
    return null;
  }

  const year = now.getFullYear();
  let deadline = new Date(year, month - 1, day);
  if (deadline < now) deadline = new Date(year + 1, month - 1, day);
  return deadline;
}
