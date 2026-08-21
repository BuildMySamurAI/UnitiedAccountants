import { SERVICE_TYPES } from "@/lib/services";

// The audience filters bulk messaging offers - the original 4 GHL-field
// services (identified by whether that field is actually set, not just by
// the client being active) plus every company_services type. Kept as one
// list so adding a new company_services type (e.g. EBT) automatically shows
// up here too, without a separate change.
export const GHL_FIELD_SERVICE_FILTERS = [
  { key: "sales_tax", label: "Sales Tax" },
  { key: "payroll", label: "Payroll" },
  { key: "reemployment_tax", label: "Reemployment Tax (RT)" },
  { key: "bookkeeping", label: "Bookkeeping" },
] as const;

export type GhlFieldServiceFilterKey = (typeof GHL_FIELD_SERVICE_FILTERS)[number]["key"];

export const MESSAGE_SERVICE_FILTERS: { key: string; label: string }[] = [
  ...GHL_FIELD_SERVICE_FILTERS,
  ...SERVICE_TYPES,
];
