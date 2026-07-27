"use client";

import { useState } from "react";
import { assignTeamMember } from "./actions";

export function AssignSelect({
  companyId,
  teamMembers,
  initialValue,
}: {
  companyId: string;
  teamMembers: { id: string; full_name: string }[];
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    initialValue ? "saved" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleChange(teamMemberId: string) {
    setValue(teamMemberId);
    setStatus("saving");
    setError(null);
    const result = await assignTeamMember(companyId, teamMemberId || null);
    if (result.ok) {
      setStatus("saved");
    } else {
      setStatus("error");
      setError(result.error);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/10 focus:border-emerald-600"
        >
          <option value="">Unassigned</option>
          {teamMembers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </select>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
            status === "saved"
              ? "bg-emerald-50 text-emerald-700"
              : status === "saving"
              ? "bg-slate-100 text-slate-500"
              : status === "error"
              ? "bg-red-50 text-red-600"
              : "bg-slate-50 text-slate-400"
          }`}
        >
          {status === "saved" && "Saved"}
          {status === "saving" && "Saving..."}
          {status === "error" && "Error"}
          {status === "idle" && "Unsaved"}
        </span>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
