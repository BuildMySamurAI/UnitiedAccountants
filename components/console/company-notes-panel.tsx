"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addNote } from "@/lib/notes-actions";
import { OUTCOME_OPTIONS, type NoteRecord } from "@/lib/notes";
import { NoteRow } from "./note-row";
import { EmptyState } from "./ui";

export function CompanyNotesPanel({
  companyId,
  notes,
  teamMembers,
  canManage,
}: {
  companyId: string;
  notes: NoteRecord[];
  teamMembers: { id: string; full_name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [outcome, setOutcome] = useState("");
  const [body, setBody] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!body.trim()) return;
    setAdding(true);
    setError(null);
    const result = await addNote({ companyId, outcome: outcome || undefined, body });
    setAdding(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBody("");
    setOutcome("");
    router.refresh();
  }

  const sorted = [...notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Notes</h3>
        <span className="hint">interaction log - internal only</span>
      </header>

      <div style={{ padding: "12px 15px" }}>
        {sorted.length === 0 && <EmptyState title="No notes yet" subtitle="Log calls, emails, and other client contact here." />}
        {sorted.map((n) => (
          <NoteRow key={n.id} note={n} teamMembers={teamMembers} canManage={canManage} />
        ))}
      </div>

      <div style={{ padding: "12px 15px", borderTop: "1px solid var(--rule-soft)" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          >
            <option value="">No outcome tag</option>
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Log a call, email, or other interaction..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{ flex: "1 1 240px", fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          />
          <button onClick={handleAdd} disabled={adding} className="cbtn">
            {adding ? "Adding..." : "+ Add note"}
          </button>
        </div>
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", padding: "0 15px 10px" }}>{error}</p>}
    </div>
  );
}
