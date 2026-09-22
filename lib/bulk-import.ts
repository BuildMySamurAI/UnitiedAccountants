import type { SupabaseClient } from "@supabase/supabase-js";
import { upsertContact, createOpportunity, type GhlCustomFieldWrite } from "@/lib/ghl/client";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { provisionPortalForOpportunity } from "@/lib/onboarding";
import { PERSONAL_FILER_VALUE, validEntityTypesFor } from "@/lib/company-type";
import { SERVICE_INTAKE_OPTIONS } from "@/lib/service-intake-mapping";

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
  "Services",
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
};

export type ImportRowError = { rowNumber: number; error: string };

function normalizeType(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v.startsWith("personal") || v === "individual") return PERSONAL_FILER_VALUE;
  return "Company";
}

function normalizeServices(raw: string): { services: string[]; invalid: string | null } {
  if (!raw.trim()) return { services: [], invalid: null };
  const services: string[] = [];
  for (const part of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const match = SERVICE_INTAKE_OPTIONS.find((opt) => opt.toLowerCase() === part.toLowerCase());
    if (!match) return { services: [], invalid: part };
    services.push(match);
  }
  return { services, invalid: null };
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
    const [firstName, lastName, email, phone, businessName, mailingAddress, physicalAddress, typeRaw, entityTypeRaw, servicesRaw] = cols.map(
      (c) => (c ?? "").trim()
    );

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

    const { services, invalid } = normalizeServices(servicesRaw ?? "");
    if (invalid) {
      errors.push({ rowNumber, error: `Unrecognized service "${invalid}" - use ${SERVICE_INTAKE_OPTIONS.join(", ")}.` });
      return;
    }

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

    const opportunity = await createOpportunity({ contactId: contact.id, name: row.businessName, customFields });

    await provisionPortalForOpportunity(opportunity.id);

    return { rowNumber: row.rowNumber, status: "imported", businessName: row.businessName, email: row.email };
  } catch (err) {
    return { rowNumber: row.rowNumber, status: "failed", businessName: row.businessName, email: row.email, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
