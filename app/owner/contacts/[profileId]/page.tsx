import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { searchConversations, getConversationMessages, getContact, type GhlMessage } from "@/lib/ghl/client";
import { ConsoleTopBar, Avatar, MultiEntityBadge, Pill, EmptyState } from "@/components/console/ui";
import { ContactTabs } from "@/components/console/contact-tabs";
import { CommunicationPanel } from "@/components/console/communication-panel";
import { ClientTasksPanel } from "@/components/console/client-tasks-panel";
import type { TaskRecord, TaskDocRecord } from "@/components/console/task-row";
import { AssignSelect } from "../../assign-select";
import { TagsCard } from "./tags-card";
import { DeleteContactButton } from "./delete-contact-button";

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
  let tags: string[] = [];
  if (profile.ghl_contact_id) {
    try {
      const conversations = await searchConversations({ contactId: profile.ghl_contact_id });
      const perConversation = await Promise.all(conversations.map((c) => getConversationMessages(c.id)));
      messages = perConversation.flat();
    } catch {
      // Conversation read failed (network/scope) - show an empty thread
      // rather than breaking the whole contact page.
      messages = [];
    }
    try {
      const contact = await getContact(profile.ghl_contact_id);
      tags = contact.tags ?? [];
    } catch {
      tags = [];
    }
  }

  const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email || "Unnamed";
  const companyList = companies ?? [];

  const teamMemberById = new Map((teamMembers ?? []).map((m) => [m.id, m]));
  const taskCompanies = companyList.map((c) => ({
    id: c.id,
    businessName: c.business_name ?? "Untitled company",
    assignedTeamMember: c.assigned_team_member_id ? teamMemberById.get(c.assigned_team_member_id) ?? null : null,
  }));

  const companyIds = companyList.map((c) => c.id);
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, company_id, profile_id, title, description, required, assigned_to, deadline_date, status, completed_at, created_by")
    .or(`profile_id.eq.${profileId}${companyIds.length > 0 ? `,company_id.in.(${companyIds.join(",")})` : ""}`)
    .order("created_at", { ascending: true });

  const taskIds = (tasks ?? []).map((t) => t.id);
  const { data: taskDocuments } =
    taskIds.length > 0
      ? await supabase.from("task_documents").select("id, task_id, file_name, storage_path").in("task_id", taskIds)
      : { data: [] };
  const documentsByTask: Record<string, TaskDocRecord[]> = {};
  for (const d of taskDocuments ?? []) {
    (documentsByTask[d.task_id] ??= []).push(d);
  }

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
      <ConsoleTopBar searchAction="/owner/contacts" crumbs={[{ label: "Contacts", href: "/owner/contacts" }, { label: name }]} />
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
            <DeleteContactButton profileId={profileId} clientName={name} companyNames={companyList.map((c) => c.business_name ?? "Untitled company")} />
          </div>
        </div>

        {profile.ghl_contact_id && <TagsCard contactId={profile.ghl_contact_id} tags={tags} />}

        <ContactTabs
          companiesCount={companyList.length}
          messagesCount={messages.length}
          tasksCount={tasks?.length ?? 0}
          companiesPanel={companiesPanel}
          communicationPanel={<CommunicationPanel contactId={profile.ghl_contact_id ?? ""} messages={messages} />}
          tasksPanel={
            <ClientTasksPanel
              profileId={profileId}
              companies={taskCompanies}
              tasks={(tasks ?? []) as TaskRecord[]}
              documentsByTask={documentsByTask}
            />
          }
        />
      </div>
    </>
  );
}
