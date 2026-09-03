// GHL returns custom field values under different keys depending on the endpoint
// (`fieldValue` on opportunities, `value` on contacts, `field_value` on writes) -
// check all variants defensively.
export function customFieldValue(
  customFields: { id: string; value?: string; fieldValue?: string; field_value?: string }[] | undefined,
  fieldId: string
): string | undefined {
  const match = customFields?.find((f) => f.id === fieldId);
  return match?.fieldValue ?? match?.value ?? match?.field_value;
}

// FILE_UPLOAD fields hold an array of {url, meta, deleted} entries (or a
// single such object for single-file fields) rather than a plain string.
export function customFieldFileUrl(
  customFields: { id: string; fieldValue?: unknown }[] | undefined,
  fieldId: string
): string | undefined {
  const match = customFields?.find((f) => f.id === fieldId);
  const value = match?.fieldValue;
  const entry = Array.isArray(value) ? value[0] : value;
  return entry && typeof entry === "object" && "url" in entry ? (entry as { url: string }).url : undefined;
}

// MULTIPLE_OPTIONS (checkbox) fields come back as an array of selected
// option strings - but occasionally as a single comma-separated string
// depending on the endpoint, so both shapes are handled defensively, same
// spirit as customFieldValue checking multiple key names.
export function customFieldMultiValue(
  customFields: { id: string; fieldValue?: unknown; value?: unknown }[] | undefined,
  fieldId: string
): string[] {
  const match = customFields?.find((f) => f.id === fieldId);
  const raw = match?.fieldValue ?? match?.value;
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string");
  if (typeof raw === "string" && raw) return raw.split(",").map((v) => v.trim());
  return [];
}

export type GhlFileFieldEntry = { url: string; name: string };

// Same as customFieldFileUrl but returns every file on a multi-file field,
// not just the first.
export function customFieldFileUrls(
  customFields: { id: string; fieldValue?: unknown }[] | undefined,
  fieldId: string
): GhlFileFieldEntry[] {
  const match = customFields?.find((f) => f.id === fieldId);
  const value = match?.fieldValue;
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  return entries
    .filter((e): e is { url: string; meta?: { name?: string } } => Boolean(e && typeof e === "object" && "url" in e))
    .map((e) => ({ url: e.url, name: e.meta?.name ?? e.url.split("/").pop() ?? "file" }));
}
