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
