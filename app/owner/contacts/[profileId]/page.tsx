import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { searchConversations, getConversationMessages, type GhlMessage } from "@/lib/ghl/client";
import { ConsoleTopBar, Avatar, MultiEntityBadge, Pill, EmptyState } from "../../_components/ui";
import { ContactTabs } from "./contact-tabs";
import { CommunicationPanel } from "./communication-panel";
import { AssignSelect } from "../../assign-select";

const STAGE_PILL: Record<string, "g" | "a" | "b" | "n"> = {
  "Client Onboarding": "b",
  "Sunbiz Filed": "b",
  "EIN Applied": "b",
  "Tax Registrations In Progress": "a",
  "QC Review": "a",
  "Active Client": "g",
};

export default async function ContactDetailPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const supabase = await supabaseServer();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, ghl_contact_id, created_at")
    .eq("id", profileId)
    .single();

  if (!profile) notFound();

  const [{ data: companies }, { data: teamMembers }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, business_name, pipeline_stage, assigned_team_member_id")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true }),
    supabase.from("team_members").select("id, full_name").order("full_name", { ascending: true }),
  ]);

  let messages: GhlMessage[] = [];
  if (profile.ghl_contact_id) {
    try {
      const conversations = await searchConversations({ contactId: profile.ghl_contact_id });
      const perConversation = await Promise.all(conversations.map((c) => getConversationMessages(c.id)));
      messages = perConversation.flat();
    } catch {
      // GHL Conversations read failed (network/scope) - show an empty thread
      // rather than breaking the whole contact page.
      messages = [];
    }
  }

  const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email || "Unnamed";
  const companyList = companies ?? [];

  const companiesPanel = (
    <div className="ccard">
      <header>
        <h3>Companies</h3>
        <span className="hint">{companyList.length} total</span>
      </header>
      {companyList.length === 0 && (
        <EmptyState title="No companies yet" subtitle="Companies appear here once onboarding creates them." />
      )}
      {companyList.map((c, i) => (
        <div key={c.id} className="rl" style={{ alignItems: "center" }}>
          <div>
            <Link href={`/owner/contacts/${profileId}/${c.id}`} className="name" style={{ color: "inherit" }}>
              {c.business_name}
            </Link>
            <div className="y" style={{ marginTop: 4 }}>
              {c.pipeline_stage ? <Pill variant={STAGE_PILL[c.pipeline_stage] ?? "n"}>{c.pipeline_stage}</Pill> : <Pill variant="n">Unknown</Pill>}
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <AssignSelect companyId={c.id} teamMembers={teamMembers ?? []} initialValue={c.assigned_team_member_id ?? ""} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <ConsoleTopBar crumbs={[{ label: "Contacts", href: "/owner/contacts" }, { label: name }]} />
      <div className="wrap">
        <div className="hero">
          <Avatar name={name} id={profile.id} size="lg" />
          <div style={{ minWidth: 0 }}>
            <h2>
              {name}
              <MultiEntityBadge count={companyList.length} />
            </h2>
            <div className="line">
              {profile.email}
              {profile.phone ? ` · ${profile.phone}` : ""} · client since {new Date(profile.created_at).getFullYear()}
            </div>
          </div>
          <div className="acts">
            {profile.phone && (
              <a className="cbtn ghost" href={`tel:${profile.phone}`}>
                Call
              </a>
            )}
            {profile.email && (
              <a className="cbtn ghost" href={`mailto:${profile.email}`}>
                Email
              </a>
            )}
          </div>
        </div>

        <ContactTabs
          companiesCount={companyList.length}
          messagesCount={messages.length}
          companiesPanel={companiesPanel}
          communicationPanel={<CommunicationPanel contactId={profile.ghl_contact_id ?? ""} messages={messages} />}
        />
      </div>
    </>
  );
}
