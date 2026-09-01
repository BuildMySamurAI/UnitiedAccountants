// Shared SSN/EIN input masks - strips everything but digits (typed or
// pasted), caps at 9 digits, then re-inserts hyphens at the fixed
// positions. The formatted string (hyphens included) is exactly what gets
// saved to GHL - e.g. typing "443443435" produces and saves "44-3443435",
// never the bare digits.
export function formatEIN(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function formatSSN(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}
