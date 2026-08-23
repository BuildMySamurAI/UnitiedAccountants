"use server";

import { upsertContact, createOpportunity } from "@/lib/ghl/client";
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
}): Promise<AddClientResult> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  const businessName = input.businessName.trim();

  if (!firstName || !lastName || !email || !businessName) {
    return { ok: false, error: "First name, last name, email, and business name are required." };
  }

  try {
    const { contact } = await upsertContact({ firstName, lastName, email, phone: input.phone?.trim() });

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
