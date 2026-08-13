import type { SupabaseClient } from "@supabase/supabase-js";
import { getAllContacts } from "@/lib/ghl/client";

export type BulkMessageRecipient = {
  profileId: string;
  contactId: string | null;
  name: string;
  tags: string[];
  dnd: boolean;
  companyNames: string[];
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
    supabase.from("companies").select("profile_id, business_name"),
    getAllContacts(),
  ]);

  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const companiesByProfile = new Map<string, string[]>();
  for (const c of companies ?? []) {
    if (!c.business_name) continue;
    if (!companiesByProfile.has(c.profile_id)) companiesByProfile.set(c.profile_id, []);
    companiesByProfile.get(c.profile_id)!.push(c.business_name);
  }

  return (profiles ?? []).map((p) => {
    const contact = p.ghl_contact_id ? contactById.get(p.ghl_contact_id) : undefined;
    return {
      profileId: p.id,
      contactId: contact?.id ?? null,
      name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "Unnamed client",
      tags: contact?.tags ?? [],
      dnd: contact?.dnd ?? false,
      companyNames: companiesByProfile.get(p.id) ?? [],
    };
  });
}
