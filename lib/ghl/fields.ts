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
