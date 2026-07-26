"use client";

import { useState } from "react";
import { updateStaffCompanyField } from "./actions";
import type { StaffFieldType } from "@/lib/ghl/staff-fields";

function SaveBadge({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  return (
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
  );
}

export function StaffField({
  companyId,
  ghlFieldId,
  dbColumn,
  label,
  type,
  options,
  initialValue,
}: {
  companyId: string;
  ghlFieldId: string;
  dbColumn: string;
  label: string;
  type: StaffFieldType;
  options?: string[];
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    initialValue ? "saved" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function save(newValue: string) {
    if (newValue === savedValue) return;
    setStatus("saving");
    setError(null);
    const result = await updateStaffCompanyField(companyId, ghlFieldId, dbColumn, newValue);
    if (result.ok) {
      setSavedValue(newValue);
      setStatus("saved");
    } else {
      setStatus("error");
      setError(result.error);
    }
  }

  return (
    <div className="py-2.5">
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600 w-48 shrink-0">{label}</label>
        <div className="flex-1 flex items-center gap-2">
          {type === "select" ? (
            <select
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                save(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/10 focus:border-emerald-600"
            >
              <option value="">--</option>
              {options?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (status !== "saving") setStatus("idle");
              }}
              onBlur={() => save(value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/10 focus:border-emerald-600"
            />
          )}
          <SaveBadge status={status} />
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-1 ml-[13.5rem]">{error}</p>}
    </div>
  );
}
