// The "Type" opportunity field's exact picklist value for an individual
// filer - clients coming in from a separate intake path who file personally
// rather than through a registered business. Everything EIN/Sunbiz/RT/Sales
// Tax related is hidden for these; SSN shows instead of EIN. Any other
// value (including "Company" or unset) is treated as a normal business
// entity - the existing behavior, unchanged.
export const PERSONAL_FILER_VALUE = "Personal (Individual tax filer)";

export function isPersonalFiler(companyType: string | null | undefined): boolean {
  return companyType === PERSONAL_FILER_VALUE;
}
