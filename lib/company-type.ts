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

// Entity Type drives the income tax deadline calculation (see
// lib/tax-deadline.ts), so a value that contradicts Type isn't just messy
// data - it silently routes a client onto the wrong deadline track. A
// Personal filer can only be "Individual"; a Company can be anything else
// the Income Tax group offers ("Individual" itself is reserved for Personal
// filers, so it's excluded here even though nothing stops a sole proprietor
// business from feeling similar in spirit - Type is what decides it).
export const PERSONAL_ENTITY_TYPES = ["Individual"] as const;
export const COMPANY_ENTITY_TYPES = ["S-Corp", "C-Corp", "Partnership"] as const;

export function validEntityTypesFor(companyType: string | null | undefined): readonly string[] {
  return isPersonalFiler(companyType) ? PERSONAL_ENTITY_TYPES : COMPANY_ENTITY_TYPES;
}
