import type { SupabaseClient } from "@supabase/supabase-js";
import { upsertContact, createOpportunity, type GhlCustomFieldWrite } from "@/lib/ghl/client";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { provisionPortalForOpportunity } from "@/lib/onboarding";
import { PERSONAL_FILER_VALUE, validEntityTypesFor } from "@/lib/company-type";
import { SERVICE_INTAKE_OPTIONS } from "@/lib/service-intake-mapping";

// Column order the template (kept locally, not served from the portal - see
// app/owner/bulk-import/page.tsx) and this parser both agree on. Services
// is 4 separate Yes/No columns rather than one combined cell - a single
// cell can't be a real dropdown for more than one value at a time, but
// each of these four can. SSN is deliberately not a column at all: bulk-
// loading plaintext SSNs into a spreadsheet on disk defeats the masking/
// audit-log/encryption this portal already enforces for that field one
// company at a time - add it per client through the portal after import
// instead. EIN is included since it isn't specially protected the same way
// and firms typically already have it on file for existing clients.
export const IMPORT_TEMPLATE_HEADER = [
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Business Name",
  "Mailing Address",
  "Physical Address",
  "Type",
  "Entity Type",
  "Bookkeeping",
  "Sales Tax",
  "Payroll/RT",
  "Income Tax",
  "EIN",
] as const;

// Dependency-free RFC4180-ish CSV parser - handles quoted fields (commas,
// embedded newlines, escaped "" quotes), CRLF and LF line endings. Good
// enough for a spreadsheet export; not a general-purpose CSV library.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export type ParsedImportRow = {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName: string;
  mailingAddress: string;
  physicalAddress: string;
  companyType: string;
  entityType: string;
  services: string[];
  ein: string;
};

export type ImportRowError = { rowNumber: number; error: string };

function normalizeType(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v.startsWith("personal") || v === "individual") return PERSONAL_FILER_VALUE;
  return "Company";
}

// Each of the 4 service columns is a Yes/No cell - "yes"/"y"/"true" (any
// case) all count as Yes, everything else (including blank) is No.
function isYes(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === "yes" || v === "y" || v === "true";
}

function servicesFromColumns(bookkeeping: string, salesTax: string, payrollRt: string, incomeTax: string): string[] {
  const [bookkeepingOpt, salesTaxOpt, payrollRtOpt, incomeTaxOpt] = SERVICE_INTAKE_OPTIONS;
  const services: string[] = [];
  if (isYes(bookkeeping)) services.push(bookkeepingOpt);
  if (isYes(salesTax)) services.push(salesTaxOpt);
  if (isYes(payrollRt)) services.push(payrollRtOpt);
  if (isYes(incomeTax)) services.push(incomeTaxOpt);
  return services;
}

// Skips the header row (row 1) - data rows are numbered from 2 to match
// what a spreadsheet program shows, for error messages that point back to
// the exact row to fix.
export function parseImportRows(csvText: string): { rows: ParsedImportRow[]; errors: ImportRowError[] } {
  const table = parseCsv(csvText);
  if (table.length === 0) return { rows: [], errors: [] };

  const dataRows = table.slice(1);
  const rows: ParsedImportRow[] = [];
  const errors: ImportRowError[] = [];

  dataRows.forEach((cols, idx) => {
    const rowNumber = idx + 2;
    const [
      firstName,
      lastName,
      email,
      phone,
      businessName,
      mailingAddress,
      physicalAddress,
      typeRaw,
      entityTypeRaw,
      bookkeepingRaw,
      salesTaxRaw,
      payrollRtRaw,
      incomeTaxRaw,
      einRaw,
    ] = cols.map((c) => (c ?? "").trim());

    if (!firstName || !lastName || !email || !businessName) {
      errors.push({ rowNumber, error: "Missing First Name, Last Name, Email, or Business Name." });
      return;
    }

    const companyType = normalizeType(typeRaw ?? "");
    const entityType = (entityTypeRaw ?? "").trim();
    if (entityType) {
      const allowed = validEntityTypesFor(companyType);
      if (!allowed.includes(entityType)) {
        errors.push({
          rowNumber,
          error: `Entity Type "${entityType}" isn't valid for Type "${companyType}" - choose ${allowed.join(" or ")}.`,
        });
        return;
      }
    }

    const services = servicesFromColumns(bookkeepingRaw ?? "", salesTaxRaw ?? "", payrollRtRaw ?? "", incomeTaxRaw ?? "");

    rows.push({
      rowNumber,
      firstName,
      lastName,
      email,
      phone: phone ?? "",
      businessName,
      mailingAddress: mailingAddress ?? "",
      physicalAddress: physicalAddress ?? "",
      companyType,
      entityType,
      services,
      ein: (einRaw ?? "").trim(),
    });
  });

  return { rows, errors };
}

export type ImportRowResult =
  | { rowNumber: number; status: "imported"; businessName: string; email: string }
  | { rowNumber: number; status: "skipped"; businessName: string; email: string; reason: string }
  | { rowNumber: number; status: "failed"; businessName: string; email: string; error: string };

// One row = one client's Contact + Opportunity in GHL, then the exact same
// provisioning /onboard itself uses for a single signup (portal invite,
// profile, company row) - the only thing bulk import adds on top is the
// duplicate-email pre-check, since a matched email here means "skip this
// row" rather than "add another company under their existing profile" (the
// behavior provisionPortalForOpportunity would otherwise give it).
export async function processImportRow(supabase: SupabaseClient, row: ParsedImportRow): Promise<ImportRowResult> {
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", row.email).maybeSingle();
  if (existing) {
    return { rowNumber: row.rowNumber, status: "skipped", businessName: row.businessName, email: row.email, reason: "A client with this email already exists." };
  }

  try {
    const { contact } = await upsertContact({ firstName: row.firstName, lastName: row.lastName, email: row.email, phone: row.phone });

    const customFields: GhlCustomFieldWrite[] = [
      { id: OPPORTUNITY_FIELDS.businessName, field_value: row.businessName },
      { id: OPPORTUNITY_FIELDS.mailingAddress, field_value: row.mailingAddress },
      { id: OPPORTUNITY_FIELDS.physicalAddress, field_value: row.physicalAddress },
      { id: OPPORTUNITY_FIELDS.companyType, field_value: row.companyType },
    ];
    if (row.entityType) customFields.push({ id: OPPORTUNITY_FIELDS.entityType, field_value: row.entityType });
    if (row.services.length > 0) customFields.push({ id: OPPORTUNITY_FIELDS.services, field_value: row.services });
    if (row.ein) customFields.push({ id: OPPORTUNITY_FIELDS.ein, field_value: row.ein });

    const opportunity = await createOpportunity({ contactId: contact.id, name: row.businessName, customFields });

    await provisionPortalForOpportunity(opportunity.id);

    return { rowNumber: row.rowNumber, status: "imported", businessName: row.businessName, email: row.email };
  } catch (err) {
    return { rowNumber: row.rowNumber, status: "failed", businessName: row.businessName, email: row.email, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
