"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTask } from "@/lib/tasks-actions";

export function ClientTaskForm({
  profileId,
  assignableTeamMembers,
}: {
  profileId: string;
  assignableTeamMembers: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const effectiveAssignedTo = assignedTo || (assignableTeamMembers.length === 1 ? assignableTeamMembers[0].id : "");

  async function handleSubmit() {
    if (!description.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await addTask({
      profileId,
      taskType: "custom",
      title: description.slice(0, 60),
      description,
      assignedTo: effectiveAssignedTo || undefined,
      deadlineDate: deadline || undefined,
      createdBy: "client",
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDescription("");
    setDeadline("");
    setAssignedTo("");
    setSent(true);
    router.refresh();
  }

  return (
    <div style={{ padding: "12px 15px", borderTop: "1px solid var(--rule-soft)" }}>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What do you need? e.g. Can you send me a copy of last year's tax return?"
        rows={3}
        style={{ width: "100%", fontSize: 13, padding: 10, borderRadius: 8, border: "1px solid var(--rule)", resize: "vertical", boxSizing: "border-box" }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
          Deadline (optional)
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          />
        </label>
        {assignableTeamMembers.length > 1 && (
          <select
            value={effectiveAssignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          >
            <option value="">Send to...</option>
            {assignableTeamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        )}
        <button onClick={handleSubmit} disabled={submitting || !description.trim()} className="cbtn" style={{ marginLeft: "auto" }}>
          {submitting ? "Sending..." : "Send request"}
        </button>
      </div>
      {sent && <p style={{ fontSize: 12, color: "var(--green)", marginTop: 8 }}>Sent - your accountant will follow up.</p>}
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 8 }}>{error}</p>}
    </div>
  );
}
