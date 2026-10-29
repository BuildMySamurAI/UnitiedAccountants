"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTask, deleteTask } from "@/lib/tasks-actions";
import { TaskDocumentUploader } from "./task-document-uploader";
import { TASK_STATUSES, type TaskStatus } from "@/lib/tasks";
import { parseDateOnly } from "@/lib/service-deadlines";
import { Pill } from "./ui";

export type TaskRecord = {
  id: string;
  company_id: string | null;
  profile_id: string | null;
  title: string;
  description: string | null;
  required: boolean | null;
  assigned_to: string | null;
  deadline_date: string | null;
  status: TaskStatus;
  completed_at: string | null;
  created_by: "team" | "client";
};

export type TaskDocRecord = { id: string; task_id: string; file_name: string; storage_path: string };

// `canManage` gates reassignment and deadline changes - owner-only, per the
// "only the owner creates and assigns tasks" rule. Everyone who can see a
// task (owner or the staff member it's assigned to) can still update its
// status - that's just doing the work, not managing who does it.
export function TaskRow({
  task,
  documents,
  assignableTeamMembers,
  scopeLabel,
  canManage,
}: {
  task: TaskRecord;
  documents: TaskDocRecord[];
  assignableTeamMembers: { id: string; full_name: string }[];
  scopeLabel?: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [deadline, setDeadline] = useState(task.deadline_date ?? "");
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [requiredDraft, setRequiredDraft] = useState<"yes" | "no">(task.required ? "yes" : "no");
  const [error, setError] = useState<string | null>(null);

  async function saveEdits() {
    setSaving(true);
    setError(null);
    const result = await updateTask(task.id, { title: titleDraft, required: requiredDraft === "yes" });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete the task "${task.title}"? This can't be undone.`)) return;
    setSaving(true);
    setError(null);
    const result = await deleteTask(task.id);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function save(fields: Parameters<typeof updateTask>[1]) {
    setSaving(true);
    await updateTask(task.id, fields);
    setSaving(false);
    router.refresh();
  }

  const statusVariant: Record<TaskStatus, "g" | "a" | "n"> = {
    "Not Started": "n",
    "In Progress": "a",
    Complete: "g",
  };

  const assigneeName = assignableTeamMembers.find((m) => m.id === task.assigned_to)?.full_name;

  return (
    <div style={{ borderBottom: "1px solid var(--rule-soft)", padding: "12px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px" }}>
          <b style={{ fontSize: 13 }}>{task.title}</b>
          {scopeLabel && <span className="y" style={{ marginLeft: 8 }}>{scopeLabel}</span>}
          {task.description && <div className="y" style={{ marginTop: 2 }}>{task.description}</div>}
        </div>

        {task.required !== null && <Pill variant={task.required ? "a" : "n"}>{task.required ? "Required" : "Not required"}</Pill>}
        <Pill variant={task.created_by === "client" ? "b" : "n"}>{task.created_by === "client" ? "From client" : "Staff added"}</Pill>

        {canManage ? (
          <select
            value={task.assigned_to ?? ""}
            onChange={(e) => save({ assignedTo: e.target.value || null })}
            disabled={saving}
            style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          >
            <option value="">Unassigned</option>
            {assignableTeamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        ) : (
          <span className="y">{assigneeName ?? "Unassigned"}</span>
        )}

        {canManage ? (
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            onBlur={() => save({ deadlineDate: deadline })}
            style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          />
        ) : (
          task.deadline_date && <span className="y">Due {parseDateOnly(task.deadline_date).toLocaleDateString()}</span>
        )}

        <select
          value={task.status}
          onChange={(e) => save({ status: e.target.value as TaskStatus })}
          disabled={saving}
          className="cbtn ghost"
          style={{ fontSize: 11, padding: "5px 8px" }}
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <Pill variant={statusVariant[task.status]}>{task.status}</Pill>

        {canManage && (
          <>
            <button
              onClick={() => {
                setTitleDraft(task.title);
                setRequiredDraft(task.required ? "yes" : "no");
                setEditing((v) => !v);
              }}
              disabled={saving}
              className="cbtn ghost"
              style={{ fontSize: 11, padding: "5px 10px" }}
            >
              {editing ? "Cancel edit" : "Edit"}
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="cbtn ghost"
              style={{ fontSize: 11, padding: "5px 10px", color: "var(--red)" }}
            >
              Delete
            </button>
          </>
        )}

        {task.company_id && (
          <button onClick={() => setExpanded((v) => !v)} className="cbtn ghost" style={{ fontSize: 11, padding: "5px 10px" }}>
            {expanded ? "Hide documents" : `Documents (${documents.length})`}
          </button>
        )}
      </div>

      {editing && canManage && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            maxLength={60}
            aria-label="Task title"
            style={{ flex: "1 1 220px", fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          />
          <select
            value={requiredDraft}
            onChange={(e) => setRequiredDraft(e.target.value as "yes" | "no")}
            aria-label="Required"
            style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          >
            <option value="yes">Required</option>
            <option value="no">Not required</option>
          </select>
          <button onClick={saveEdits} disabled={saving} className="cbtn" style={{ fontSize: 11, padding: "5px 10px" }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--red)" }}>{error}</div>
      )}

      {task.completed_at && (
        <div className="y" style={{ marginTop: 4 }}>
          Completed {parseDateOnly(task.completed_at).toLocaleDateString()}
        </div>
      )}

      {expanded && task.company_id && <TaskDocumentUploader companyId={task.company_id} taskId={task.id} existing={documents} />}
    </div>
  );
}
