import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { searchConversations, getConversationMessages, type GhlMessage } from "@/lib/ghl/client";
import { ConsoleTopBar, Avatar, MultiEntityBadge, Pill, EmptyState } from "@/components/console/ui";
import { ContactTabs } from "@/components/console/contact-tabs";
import { CommunicationPanel } from "@/components/console/communication-panel";
import { ClientTasksPanel } from "@/components/console/client-tasks-panel";
import { ClientNotesPanel } from "@/components/console/client-notes-panel";
import type { TaskRecord, TaskDocRecord } from "@/components/console/task-row";
import { ClientStatusToggle } from "@/components/console/client-status-toggle";
import { ContactInfoPanel } from "@/components/console/contact-info-panel";

const STAGE_PILL: Record<string, "g" | "a" | "b" | "n"> = {
  "Client Onboarding": "b",
  "Sunbiz Filed": "b",
  "EIN Applied": "b",
  "Tax Registrations In Progress": "a",
  "QC Review": "a",
  "Active Client": "g",
};

export default async function StaffClientDetailPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const supabase = await supabaseServer();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, ghl_contact_id, created_at, status, owner_legal_name, owner_ssn, owner_date_of_birth, owner_address")
    .eq("id", profileId)
    .single();

  if (!profile) notFound();

  // RLS restricts this to companies assigned to the logged-in team member,
  // so this is exactly (and only) what they're allowed to see for this client.
  const { data: companies } = await supabase
    .from("companies")
    .select("id, business_name, pipeline_stage, assigned_team_member_id")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  // Without at least one assigned company, this client is out of scope for
  // this team member entirely - including their conversation history, which
  // is fetched below and isn't itself company-scoped in GHL.
  if (!companies || companies.length === 0) notFound();

  const { data: teamMembers } = await supabase.from("team_members").select("id, full_name").order("full_name", { ascending: true });

  let messages: GhlMessage[] = [];
  if (profile.ghl_contact_id) {
    try {
      const conversations = await searchConversations({ contactId: profile.ghl_contact_id });
      const perConversation = await Promise.all(conversations.map((c) => getConversationMessages(c.id)));
      messages = perConversation.flat();
    } catch {
      messages = [];
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

  const { data: notes } = await supabase
    .from("notes")
    .select("id, company_id, profile_id, outcome, body, created_by_name, created_at")
    .or(`profile_id.eq.${profileId}${companyIds.length > 0 ? `,company_id.in.(${companyIds.join(",")})` : ""}`)
    .order("created_at", { ascending: false });

  const companiesPanel = (
    <div className="ccard">
      <header>
        <h3>Companies</h3>
        <span className="hint">{companyList.length} assigned to you</span>
      </header>
      {companyList.length === 0 && <EmptyState title="No companies assigned yet" />}
      {companyList.map((c) => (
        <Link key={c.id} href={`/staff/${profileId}/${c.id}`} className="rl click" style={{ color: "inherit" }}>
          <div>
            <div className="name">{c.business_name}</div>
            <div className="y" style={{ marginTop: 4 }}>
              {c.pipeline_stage ? <Pill variant={STAGE_PILL[c.pipeline_stage] ?? "n"}>{c.pipeline_stage}</Pill> : <Pill variant="n">Unknown</Pill>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <ConsoleTopBar searchAction="/staff" crumbs={[{ label: "My Clients", href: "/staff" }, { label: name }]} />
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
            <ClientStatusToggle profileId={profileId} initialStatus={profile.status ?? "Active"} />
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
          tasksCount={tasks?.length ?? 0}
          notesCount={notes?.length ?? 0}
          companiesPanel={companiesPanel}
          communicationPanel={<CommunicationPanel contactId={profile.ghl_contact_id ?? ""} messages={messages} />}
          tasksPanel={
            <ClientTasksPanel
              profileId={profileId}
              companies={taskCompanies}
              tasks={(tasks ?? []) as TaskRecord[]}
              documentsByTask={documentsByTask}
              teamMembers={teamMembers ?? []}
            />
          }
          notesPanel={
            <ClientNotesPanel profileId={profileId} companies={taskCompanies} notes={notes ?? []} teamMembers={teamMembers ?? []} />
          }
          infoPanel={<ContactInfoPanel profileId={profileId} profile={profile} />}
        />
      </div>
    </>
  );
}
