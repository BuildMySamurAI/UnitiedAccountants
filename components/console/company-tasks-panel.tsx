"use client";

import { useState } from "react";
import Link from "next/link";
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
  availableTags,
  activeTags,
  basePath,
  keepParams,
}: {
  companyId: string;
  tasks: TaskRecord[];
  documentsByTask: Record<string, TaskDocRecord[]>;
  teamMembers: { id: string; full_name: string }[];
  assignedTeamMember: { id: string; full_name: string } | null;
  canManage: boolean;
  availableTags: string[];
  activeTags: string[]; // lower-cased, from ?tasktag=
  basePath: string; // this company page's own path, for filter links
  keepParams: [string, string][]; // the services filter's selection, preserved in our links
}) {
  const router = useRouter();
  const [newTags, setNewTags] = useState<string[]>([]);
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
      tags: newTags,
      createdBy: "team",
    });
    setAdding(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDescription("");
    setNewTags([]);
    router.refresh();
  }

  const shown =
    activeTags.length > 0 ? tasks.filter((t) => (t.tags ?? []).some((x) => activeTags.includes(x.toLowerCase()))) : tasks;

  function hrefFor(nextTags: string[]): string {
    const params = new URLSearchParams();
    for (const [k, v] of keepParams) params.append(k, v);
    for (const n of nextTags) params.append("tasktag", n);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Tasks</h3>
        <span className="hint">internal only - not visible to the client</span>
      </header>

      {availableTags.length > 0 && (
        <div style={{ padding: "12px 15px", borderBottom: "1px solid var(--rule-soft)" }}>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>
            Filter by tag - matches any selected
            {activeTags.length > 0 && (
              <>
                {" · "}
                <Link href={hrefFor([])}>clear</Link>
              </>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {availableTags.map((t) => {
              const on = activeTags.includes(t.toLowerCase());
              const next = on ? activeTags.filter((a) => a !== t.toLowerCase()) : [...activeTags, t.toLowerCase()];
              return (
                <Link
                  key={t}
                  href={hrefFor(next)}
                  className="ctag"
                  style={{
                    background: on ? "var(--green-soft, #e4efe9)" : undefined,
                    borderColor: on ? "var(--green)" : undefined,
                  }}
                >
                  {on ? "✓ " : ""}
                  {t}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ padding: "12px 15px" }}>
        {tasks.length === 0 && <EmptyState title="No tasks tracked yet" />}
        {tasks.length > 0 && shown.length === 0 && <EmptyState title="No tasks match the selected tags" />}
        {shown.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            documents={documentsByTask[t.id] ?? []}
            assignableTeamMembers={teamMembers}
            canManage={canManage}
            availableTags={availableTags}
          />
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

          {availableTags.length > 0 && (
            <div style={{ flexBasis: "100%", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {availableTags.map((t) => {
                const on = newTags.includes(t);
                return (
                  <button
                    type="button"
                    key={t}
                    className="ctag"
                    onClick={() => setNewTags(on ? newTags.filter((x) => x !== t) : [...newTags, t])}
                    style={{
                      cursor: "pointer",
                      background: on ? "var(--green-soft, #e4efe9)" : undefined,
                      borderColor: on ? "var(--green)" : undefined,
                    }}
                  >
                    {on ? "✓ " : "+ "}
                    {t}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", padding: "0 15px 10px" }}>{error}</p>}
    </div>
  );
}
