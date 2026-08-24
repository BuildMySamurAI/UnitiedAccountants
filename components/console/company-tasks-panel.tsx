"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTask } from "@/lib/tasks-actions";
import { TaskRow, type TaskRecord, type TaskDocRecord } from "./task-row";
import { EmptyState } from "./ui";

// Lives on a specific company's own page. Only the owner creates tasks or
// reassigns them (canManage=false hides the add-form and locks assignee/
// deadline on every row) - staff just see what they're on the hook for and
// update status as they work it.
export function CompanyTasksPanel({
  companyId,
  tasks,
  documentsByTask,
  teamMembers,
  assignedTeamMember,
  canManage,
}: {
  companyId: string;
  tasks: TaskRecord[];
  documentsByTask: Record<string, TaskDocRecord[]>;
  teamMembers: { id: string; full_name: string }[];
  assignedTeamMember: { id: string; full_name: string } | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [required, setRequired] = useState(false);
  const [assignedTo, setAssignedTo] = useState(assignedTeamMember?.id ?? "");
  const [deadline, setDeadline] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setAdding(true);
    setError(null);
    const result = await addTask({
      companyId,
      taskType: "custom",
      title: description.slice(0, 60) || "Task",
      description: description || undefined,
      required,
      assignedTo: assignedTo || undefined,
      deadlineDate: deadline || undefined,
      createdBy: "team",
    });
    setAdding(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDescription("");
    router.refresh();
  }

  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Tasks</h3>
        <span className="hint">internal only - not visible to the client</span>
      </header>

      <div style={{ padding: "12px 15px" }}>
        {tasks.length === 0 && <EmptyState title="No tasks tracked yet" />}
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} documents={documentsByTask[t.id] ?? []} assignableTeamMembers={teamMembers} canManage={canManage} />
        ))}
      </div>

      {canManage && (
        <div style={{ padding: "12px 15px", borderTop: "1px solid var(--rule-soft)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            Required?
            <select
              value={required ? "Yes" : "No"}
              onChange={(e) => setRequired(e.target.value === "Yes")}
              style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>

          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ flex: "1 1 160px", fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          />

          <select
            value={assignedTo}
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
      )}
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", padding: "0 15px 10px" }}>{error}</p>}
    </div>
  );
}
