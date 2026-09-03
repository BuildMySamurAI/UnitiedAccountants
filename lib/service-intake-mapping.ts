import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";

// Exact picklist options on the "Services" multi-select opportunity field,
// filled at intake (own /onboard form, or a GHL-native form the webhook
// covers) - "Payroll/ RT" is one combined checkbox, not two separate ones.
export const SERVICE_INTAKE_OPTIONS = ["Bookkeeping", "Sales Tax", "Payroll/ RT", "Income tax"] as const;
export type ServiceIntakeOption = (typeof SERVICE_INTAKE_OPTIONS)[number];

// Which *ServiceEnabled opportunity field(s) each checkbox seeds to "Yes" -
// "Payroll/ RT" maps to both Payroll and RT together, since it's a single
// combined option covering two otherwise-independent services.
const SERVICE_INTAKE_FIELD_MAP: Record<ServiceIntakeOption, (keyof typeof OPPORTUNITY_FIELDS)[]> = {
  Bookkeeping: ["bookkeepingServiceEnabled"],
  "Sales Tax": ["salesTaxServiceEnabled"],
  "Payroll/ RT": ["payrollServiceEnabled", "rtServiceEnabled"],
  "Income tax": ["incomeTaxServiceEnabled"],
};

// Turns the client's (or staff's, via the GHL-native intake) checkbox
// selection into the set of *ServiceEnabled fields to write "Yes" to.
// Unselected services are left untouched entirely (no explicit "No") - a
// never-configured service is already hidden by default, same convention
// used everywhere else in the portal. This only ever runs once, at
// provisioning time for a brand-new opportunity - after that, the
// individual toggles on the company page are the live source of truth and
// this selection is never re-read or re-applied.
export function servicesToEnabledFieldWrites(selected: string[]): { id: string; field_value: string }[] {
  const keys = new Set<keyof typeof OPPORTUNITY_FIELDS>();
  for (const option of selected) {
    const mapped = SERVICE_INTAKE_FIELD_MAP[option as ServiceIntakeOption];
    if (mapped) for (const k of mapped) keys.add(k);
  }
  return [...keys].map((key) => ({ id: OPPORTUNITY_FIELDS[key], field_value: "Yes" }));
}

// Supabase mirror column name for each *ServiceEnabled field - the same
// columns the "Active Services" toggles already write to.
const ENABLED_FIELD_DB_COLUMN: Partial<Record<keyof typeof OPPORTUNITY_FIELDS, string>> = {
  bookkeepingServiceEnabled: "bookkeeping_service_enabled",
  salesTaxServiceEnabled: "sales_tax_service_enabled",
  payrollServiceEnabled: "payroll_service_enabled",
  rtServiceEnabled: "rt_service_enabled",
  incomeTaxServiceEnabled: "income_tax_service_enabled",
};

export function servicesToEnabledMirrorColumns(selected: string[]): Record<string, string> {
  const keys = new Set<keyof typeof OPPORTUNITY_FIELDS>();
  for (const option of selected) {
    const mapped = SERVICE_INTAKE_FIELD_MAP[option as ServiceIntakeOption];
    if (mapped) for (const k of mapped) keys.add(k);
  }
  const columns: Record<string, string> = {};
  for (const key of keys) {
    const column = ENABLED_FIELD_DB_COLUMN[key];
    if (column) columns[column] = "Yes";
  }
  return columns;
}
