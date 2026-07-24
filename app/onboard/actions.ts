"use server";

import { upsertContact, createOpportunity } from "@/lib/ghl/client";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { provisionPortalForOpportunity } from "@/lib/onboarding";

export type OnboardResult =
  | { ok: true; opportunityId: string }
  | { ok: false; error: string };

export async function submitOnboardingForm(formData: FormData): Promise<OnboardResult> {
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const businessName = String(formData.get("businessName") || "").trim();
  const mailingAddress = String(formData.get("mailingAddress") || "").trim();
  const physicalAddress = String(formData.get("physicalAddress") || "").trim();

  if (!firstName || !lastName || !email || !businessName) {
    return { ok: false, error: "First name, last name, email, and business name are required." };
  }

  try {
    const { contact } = await upsertContact({ firstName, lastName, email, phone });

    const opportunity = await createOpportunity({
      contactId: contact.id,
      name: businessName,
      customFields: [
        { id: OPPORTUNITY_FIELDS.businessName, field_value: businessName },
        { id: OPPORTUNITY_FIELDS.mailingAddress, field_value: mailingAddress },
        { id: OPPORTUNITY_FIELDS.physicalAddress, field_value: physicalAddress },
      ],
    });

    await provisionPortalForOpportunity(opportunity.id);

    return { ok: true, opportunityId: opportunity.id };
  } catch (err) {
    console.error(err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
