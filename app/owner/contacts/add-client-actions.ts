"use server";

import { upsertContact, createOpportunity, addContactTags } from "@/lib/ghl/client";
import { getSelectableTags, resolveAllowedTags } from "@/lib/tags";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { provisionPortalForOpportunity } from "@/lib/onboarding";

export type AddClientResult =
  | { ok: true; profileId: string; companyId: string }
  | { ok: false; error: string };

// Staff-facing equivalent of the public /onboard intake form - same
// underlying GHL contact/opportunity creation and portal provisioning, just
// triggered from the Contacts screen instead of the client filling it out
// themselves. Lets the practice add a client manually (walk-in, phone
// referral, etc.) without needing them to submit the public form first.
export async function addClientManually(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  businessName: string;
  mailingAddress?: string;
  physicalAddress?: string;
  tags?: string[];
}): Promise<AddClientResult> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  const businessName = input.businessName.trim();

  if (!firstName || !lastName || !email || !businessName) {
    return { ok: false, error: "First name, last name, email, and business name are required." };
  }

  try {
    // Validated before anything is written, so a bad tag can't leave a
    // half-created client behind. Only tags on the fixed GHL list are allowed.
    let tags: string[] = [];
    if (input.tags?.length) {
      const resolved = resolveAllowedTags(input.tags, await getSelectableTags());
      if (!resolved.ok) {
        return { ok: false, error: `Unknown tag(s): ${resolved.unknown.join(", ")}.` };
      }
      tags = resolved.tags;
    }

    const { contact } = await upsertContact({ firstName, lastName, email, phone: input.phone?.trim() });
    if (tags.length > 0) await addContactTags(contact.id, tags);

    const opportunity = await createOpportunity({
      contactId: contact.id,
      name: businessName,
      customFields: [
        { id: OPPORTUNITY_FIELDS.businessName, field_value: businessName },
        { id: OPPORTUNITY_FIELDS.mailingAddress, field_value: input.mailingAddress?.trim() ?? "" },
        { id: OPPORTUNITY_FIELDS.physicalAddress, field_value: input.physicalAddress?.trim() ?? "" },
      ],
    });

    const { profileId, company } = await provisionPortalForOpportunity(opportunity.id);

    return { ok: true, profileId, companyId: company.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
