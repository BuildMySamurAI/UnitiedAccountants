import type { SupabaseClient } from "@supabase/supabase-js";
import { getAllContacts, getOpportunity } from "@/lib/ghl/client";
import { customFieldValue } from "@/lib/ghl/fields";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import type { GhlFieldServiceFilterKey } from "@/lib/message-service-filters";

export type BulkMessageRecipient = {
  profileId: string;
  contactId: string | null;
  name: string;
  tags: string[];
  dnd: boolean;
  companyNames: string[];
  serviceTypes: string[];
};

// Builds the audience for bulk messaging. Deliberately queries `profiles`
// with the caller's own session rather than an admin client - RLS already
// scopes this correctly for both roles (owner sees every profile, a team
// member only sees profiles reachable through a company assigned to them),
// so reusing it here means the audience list can never include someone that
// role isn't otherwise allowed to see.
export async function getBulkMessageRecipients(supabase: SupabaseClient): Promise<BulkMessageRecipient[]> {
  const [{ data: profiles }, { data: companies }, contacts] = await Promise.all([
    // Inactive clients are excluded by default - they're still fully
    // reachable via the Communication panel on their own contact page,
    // just not part of this "everyone active" audience.
    supabase.from("profiles").select("id, ghl_contact_id, first_name, last_name, email").eq("status", "Active"),
    supabase.from("companies").select("id, profile_id, business_name, ghl_opportunity_id"),
    getAllContacts(),
  ]);

  const companyList = companies ?? [];

  // Which of the 4 GHL-field services each company actually has active -
  // read live, not from the Supabase mirror, per "use current service
  // selection/status data". Driven by the same *ServiceEnabled toggles that
  // gate whether each section even shows up on the company page - a service
  // that's been turned off shouldn't still pull that client into a bulk
  // send just because old filing-frequency data is still sitting there from
  // before it was disabled. A company that errors (e.g. deleted in GHL but
  // not yet synced) just contributes no service tags rather than failing
  // the whole audience build.
  const companyServiceTags = await Promise.all(
    companyList.map(async (c): Promise<{ companyId: string; tags: GhlFieldServiceFilterKey[] }> => {
      try {
        const opportunity = await getOpportunity(c.ghl_opportunity_id);
        const cf = opportunity.customFields;
        const tags: GhlFieldServiceFilterKey[] = [];
        if (customFieldValue(cf, OPPORTUNITY_FIELDS.salesTaxServiceEnabled) === "Yes") tags.push("sales_tax");
        if (customFieldValue(cf, OPPORTUNITY_FIELDS.payrollServiceEnabled) === "Yes") tags.push("payroll");
        if (customFieldValue(cf, OPPORTUNITY_FIELDS.rtServiceEnabled) === "Yes") tags.push("reemployment_tax");
        if (customFieldValue(cf, OPPORTUNITY_FIELDS.bookkeepingServiceEnabled) === "Yes") tags.push("bookkeeping");
        return { companyId: c.id, tags };
      } catch {
        return { companyId: c.id, tags: [] };
      }
    })
  );
  const ghlServiceTagsByCompany = new Map(companyServiceTags.map((c) => [c.companyId, c.tags]));

  const { data: activeServices } = await supabase.from("company_services").select("company_id, service_type").eq("status", "Active");
  const companyServicesByCompany = new Map<string, string[]>();
  for (const s of activeServices ?? []) {
    if (!companyServicesByCompany.has(s.company_id)) companyServicesByCompany.set(s.company_id, []);
    companyServicesByCompany.get(s.company_id)!.push(s.service_type);
  }

  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const companiesByProfile = new Map<string, { businessName: string; serviceTypes: Set<string> }[]>();
  for (const c of companyList) {
    if (!companiesByProfile.has(c.profile_id)) companiesByProfile.set(c.profile_id, []);
    const serviceTypes = new Set<string>([...(ghlServiceTagsByCompany.get(c.id) ?? []), ...(companyServicesByCompany.get(c.id) ?? [])]);
    companiesByProfile.get(c.profile_id)!.push({ businessName: c.business_name ?? "", serviceTypes });
  }

  return (profiles ?? []).map((p) => {
    const contact = p.ghl_contact_id ? contactById.get(p.ghl_contact_id) : undefined;
    const profileCompanies = companiesByProfile.get(p.id) ?? [];
    const serviceTypes = new Set<string>();
    for (const c of profileCompanies) for (const s of c.serviceTypes) serviceTypes.add(s);

    return {
      profileId: p.id,
      contactId: contact?.id ?? null,
      name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "Unnamed client",
      tags: contact?.tags ?? [],
      dnd: contact?.dnd ?? false,
      companyNames: profileCompanies.filter((c) => c.businessName).map((c) => c.businessName),
      serviceTypes: [...serviceTypes],
    };
  });
}
