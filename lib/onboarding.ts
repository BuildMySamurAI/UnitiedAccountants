import { supabaseAdmin } from "@/lib/supabase/admin";
import { getContact, getOpportunity, updateContactCustomFields, updateOpportunityCustomFields } from "@/lib/ghl/client";
import { CONTACT_FIELDS, OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { customFieldValue, customFieldMultiValue } from "@/lib/ghl/fields";
import { servicesToEnabledFieldWrites, servicesToEnabledMirrorColumns } from "@/lib/service-intake-mapping";

// Called whenever an opportunity lands in the "Client Onboarding" stage of
// "New Corporation Onboarding" - either right after the intake form creates
// it, or later via the GHL webhook for opportunities created/moved directly
// in GHL. Both paths must produce the same result, so this is the one place
// the logic lives.
export async function provisionPortalForOpportunity(opportunityId: string) {
  const opportunity = await getOpportunity(opportunityId);
  const contact = await getContact(opportunity.contactId);

  const businessName =
    customFieldValue(opportunity.customFields, OPPORTUNITY_FIELDS.businessName) ?? opportunity.name;
  const mailingAddress = customFieldValue(opportunity.customFields, OPPORTUNITY_FIELDS.mailingAddress);
  const physicalAddress = customFieldValue(opportunity.customFields, OPPORTUNITY_FIELDS.physicalAddress);

  // Seeds the per-service enabled toggles from whatever the client (or
  // whoever filled the intake) checked on the "Services" field - only ever
  // applied here, once, at provisioning time. From this point on the
  // individual toggles on the company page are the live source of truth;
  // staff can freely override/add/remove without this running again.
  const selectedServices = customFieldMultiValue(opportunity.customFields, OPPORTUNITY_FIELDS.services);
  const enabledFieldWrites = servicesToEnabledFieldWrites(selectedServices);
  if (enabledFieldWrites.length > 0) {
    await updateOpportunityCustomFields(opportunity.id, enabledFieldWrites);
  }
  const enabledMirrorColumns = servicesToEnabledMirrorColumns(selectedServices);

  const portalAccountCreated = customFieldValue(contact.customFields, CONTACT_FIELDS.portalAccountCreated);

  const admin = supabaseAdmin();
  let profileId: string;

  if (portalAccountCreated !== "Yes") {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(contact.email, {
      data: { first_name: contact.firstName, last_name: contact.lastName },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    });
    if (inviteError) throw inviteError;
    profileId = invited.user.id;

    const { error: profileError } = await admin.from("profiles").insert({
      id: profileId,
      ghl_contact_id: contact.id,
      email: contact.email,
      first_name: contact.firstName,
      last_name: contact.lastName,
      phone: contact.phone,
    });
    if (profileError) throw profileError;

    await updateContactCustomFields(contact.id, [
      { id: CONTACT_FIELDS.portalAccountCreated, field_value: "Yes" },
      { id: CONTACT_FIELDS.portalUserId, field_value: profileId },
    ]);
  } else {
    const { data: existingProfile, error: lookupError } = await admin
      .from("profiles")
      .select("id")
      .eq("ghl_contact_id", contact.id)
      .single();
    if (lookupError) throw lookupError;
    profileId = existingProfile.id;
  }

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      profile_id: profileId,
      ghl_opportunity_id: opportunity.id,
      business_name: businessName,
      mailing_address: mailingAddress,
      physical_address: physicalAddress,
      pipeline_stage: "Client Onboarding",
      ...enabledMirrorColumns,
    })
    .select()
    .single();
  if (companyError) throw companyError;

  return { profileId, company };
}
