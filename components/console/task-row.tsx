"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTask } from "@/lib/tasks-actions";
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

// `assignableTeamMembers` is pre-constrained by the caller to whoever's
// actually assigned to this task's company (or companies, for a client-level
// task) - never the full team roster, per the "assignment always follows
// who already serves this client" rule.
export function TaskRow({
  task,
  documents,
  assignableTeamMembers,
  scopeLabel,
}: {
  task: TaskRecord;
  documents: TaskDocRecord[];
  assignableTeamMembers: { id: string; full_name: string }[];
  scopeLabel?: string;
}) {
  const router = useRouter();
  const [deadline, setDeadline] = useState(task.deadline_date ?? "");
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

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

        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          onBlur={() => save({ deadlineDate: deadline })}
          style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        />

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

        {task.company_id && (
          <button onClick={() => setExpanded((v) => !v)} className="cbtn ghost" style={{ fontSize: 11, padding: "5px 10px" }}>
            {expanded ? "Hide documents" : `Documents (${documents.length})`}
          </button>
        )}
      </div>

      {task.completed_at && (
        <div className="y" style={{ marginTop: 4 }}>
          Completed {parseDateOnly(task.completed_at).toLocaleDateString()}
        </div>
      )}

      {expanded && task.company_id && <TaskDocumentUploader companyId={task.company_id} taskId={task.id} existing={documents} />}
    </div>
  );
}
