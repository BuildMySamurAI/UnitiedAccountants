"use client";

import { useState } from "react";
import { updateAssignedEmployee } from "./actions";

export function AssigneeSelect({
  companyId,
  users,
  initialValue,
}: {
  companyId: string;
  users: { id: string; name: string; email: string }[];
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    initialValue ? "saved" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleChange(userId: string) {
    setValue(userId);
    setStatus("saving");
    setError(null);
    const result = await updateAssignedEmployee(companyId, userId);
    if (result.ok) {
      setStatus("saved");
    } else {
      setStatus("error");
      setError(result.error);
    }
  }

  return (
    <div className="py-2.5">
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600 w-48 shrink-0">Assigned Employee</label>
        <div className="flex-1 flex items-center gap-2">
          <select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/10 focus:border-emerald-600"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
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
      </div>
      {error && <p className="text-xs text-red-600 mt-1 ml-[13.5rem]">{error}</p>}
    </div>
  );
}
