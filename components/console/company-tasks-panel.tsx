"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTask } from "@/lib/tasks-actions";
import { TaskRow, type TaskRecord, type TaskDocRecord } from "./task-row";
import { EmptyState } from "./ui";

// Lives on a specific company's own page - company_id comes from context, so
// there's no scope picker here. Assignment always follows this company's own
// assigned team member (the single-item "assignable" list below), per the
// "assignment follows who's already assigned to the client" rule.
export function CompanyTasksPanel({
  companyId,
  tasks,
  documentsByTask,
  assignedTeamMember,
}: {
  companyId: string;
  tasks: TaskRecord[];
  documentsByTask: Record<string, TaskDocRecord[]>;
  assignedTeamMember: { id: string; full_name: string } | null;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [required, setRequired] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignable = assignedTeamMember ? [assignedTeamMember] : [];

  async function handleAdd() {
    setAdding(true);
    setError(null);
    const result = await addTask({
      companyId,
      taskType: "custom",
      title: description.slice(0, 60) || "Task",
      description: description || undefined,
      required,
      assignedTo: assignedTeamMember?.id,
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
          <TaskRow key={t.id} task={t} documents={documentsByTask[t.id] ?? []} assignableTeamMembers={assignable} />
        ))}
      </div>

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

        <span className="y">{assignedTeamMember ? `Assigns to ${assignedTeamMember.full_name}` : "No team member assigned to this company yet"}</span>

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
