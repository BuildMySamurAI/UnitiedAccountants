"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTask } from "@/lib/tasks-actions";
import type { NoteRecord } from "@/lib/notes";
import { Pill } from "./ui";

export function NoteRow({
  note,
  teamMembers,
  canManage,
}: {
  note: NoteRecord;
  teamMembers: { id: string; full_name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [title, setTitle] = useState(`Follow up: ${note.body.slice(0, 50)}`);
  const [assignedTo, setAssignedTo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    const result = await addTask({
      companyId: note.company_id ?? undefined,
      profileId: note.profile_id ?? undefined,
      taskType: "custom",
      title: title.slice(0, 60) || "Follow up",
      assignedTo: assignedTo || undefined,
      deadlineDate: deadline || undefined,
      createdBy: "team",
    });
    setCreating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <div style={{ borderBottom: "1px solid var(--rule-soft)", padding: "12px 0" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            {note.outcome && <Pill variant="b">{note.outcome}</Pill>}
            <span className="y">
              {note.created_by_name ?? "Staff"} - {new Date(note.created_at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
            </span>
          </div>
          <div style={{ fontSize: 13 }}>{note.body}</div>
        </div>

        {canManage && !done && (
          <button className="cbtn ghost" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => setFollowUpOpen((v) => !v)}>
            {followUpOpen ? "Cancel" : "+ Follow-up task"}
          </button>
        )}
        {done && <Pill variant="g">Follow-up task created</Pill>}
      </div>

      {canManage && followUpOpen && !done && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ flex: "1 1 200px", fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
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
          <button className="cbtn" onClick={handleCreate} disabled={creating}>
            {creating ? "Creating..." : "Create task"}
          </button>
        </div>
      )}
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6 }}>{error}</p>}
    </div>
  );
}
