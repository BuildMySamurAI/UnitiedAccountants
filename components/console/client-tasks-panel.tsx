"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTask } from "@/lib/tasks-actions";
import { TaskRow, type TaskRecord, type TaskDocRecord } from "./task-row";
import { EmptyState } from "./ui";

type CompanyOption = { id: string; businessName: string; assignedTeamMember: { id: string; full_name: string } | null };

// Lives on a client's Contact page (both Owner and Team portals). Staff
// picks scope first - client-level, or one of this client's companies -
// then can assign the task to any team member, not just whoever the scoped
// company happens to be assigned to; that company's assigned member is
// only offered as the default pick.
export function ClientTasksPanel({
  profileId,
  companies,
  tasks,
  documentsByTask,
  teamMembers,
}: {
  profileId: string;
  companies: CompanyOption[];
  tasks: TaskRecord[];
  documentsByTask: Record<string, TaskDocRecord[]>;
  teamMembers: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [scope, setScope] = useState<string>("client"); // "client" or a companyId
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultAssignee = companies.find((c) => c.id === scope)?.assignedTeamMember?.id ?? "";
  const effectiveAssignedTo = assignedTo || defaultAssignee;

  async function handleAdd() {
    setAdding(true);
    setError(null);
    const isCompanyScope = scope !== "client";
    const result = await addTask({
      companyId: isCompanyScope ? scope : undefined,
      profileId: isCompanyScope ? undefined : profileId,
      taskType: "custom",
      title: description.slice(0, 60) || "Task",
      description: description || undefined,
      assignedTo: effectiveAssignedTo || undefined,
      deadlineDate: deadline || undefined,
      createdBy: "team",
    });
    setAdding(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDescription("");
    setAssignedTo("");
    router.refresh();
  }

  function scopeLabelFor(task: TaskRecord): string {
    if (!task.company_id) return "Client request";
    return companies.find((c) => c.id === task.company_id)?.businessName ?? "";
  }

  return (
    <div className="ccard">
      <header>
        <h3>Tasks</h3>
        <span className="hint">internal only - not visible to the client</span>
      </header>

      <div style={{ padding: "12px 15px" }}>
        {tasks.length === 0 && <EmptyState title="No tasks tracked yet" />}
        {tasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            documents={documentsByTask[t.id] ?? []}
            assignableTeamMembers={teamMembers}
            scopeLabel={scopeLabelFor(t)}
          />
        ))}
      </div>

      <div style={{ padding: "12px 15px", borderTop: "1px solid var(--rule-soft)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={scope}
          onChange={(e) => {
            setScope(e.target.value);
            setAssignedTo("");
          }}
          style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        >
          <option value="client">For the client</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.businessName}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ flex: "1 1 160px", fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        />

        <select
          value={effectiveAssignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        >
          <option value="">Unassigned</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        />

        <button onClick={handleAdd} disabled={adding} className="cbtn">
          {adding ? "Adding..." : "+ Add task"}
        </button>
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", padding: "0 15px 10px" }}>{error}</p>}
    </div>
  );
}
