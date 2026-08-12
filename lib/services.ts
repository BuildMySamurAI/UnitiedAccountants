// Service types tracked in company_services - separate from the GHL-mirrored
// custom fields, since a company can hold several of these at once (e.g. two
// DBPR licenses) and GHL custom fields only ever hold a single value. See
// lib/service-deadlines.ts for the per-type deadline behavior.
export const SERVICE_TYPES = [
  { key: "dbpr_license", label: "DBPR License" },
  { key: "corp_renewal", label: "Corporation Renewal" },
  { key: "food_permit", label: "Food Permit" },
  { key: "sales_tax_cert", label: "Sales Tax Certificate Renewal" },
] as const;

export type ServiceTypeKey = (typeof SERVICE_TYPES)[number]["key"];

export const SERVICE_TYPE_LABEL: Record<ServiceTypeKey, string> = Object.fromEntries(
  SERVICE_TYPES.map((s) => [s.key, s.label])
) as Record<ServiceTypeKey, string>;

export const DBPR_LICENSE_TYPES = [
  "Tobacco Retailer",
  "ABT",
  "Barbershop",
  "Liquor",
  "Mobile Food",
  "Non-Seating Food",
  "Seating Food",
  "Tobacco Wholesale",
] as const;
