"use client";

import { useState } from "react";
import { updateCompanyField, type EditableFieldKey } from "./actions";

function CheckIcon({ done }: { done: boolean }) {
  return (
    <span
      className={`mt-7 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
        done ? "bg-emerald-600 text-white" : "bg-slate-200"
      }`}
    >
      {done && (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
    </span>
  );
}

export function AutoSaveField({
  companyId,
  fieldKey,
  label,
  initialValue,
}: {
  companyId: string;
  fieldKey: EditableFieldKey;
  label: string;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    initialValue ? "saved" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleBlur() {
    if (value === savedValue) return;
    setStatus("saving");
    setError(null);
    const result = await updateCompanyField(companyId, fieldKey, value);
    if (result.ok) {
      setSavedValue(value);
      setStatus("saved");
    } else {
      setStatus("error");
      setError(result.error);
    }
  }

  const done = status === "saved" && value.trim().length > 0;

  return (
    <div className="flex items-start gap-3 py-4">
      <CheckIcon done={done} />
      <div className="flex-1 min-w-0">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (status !== "saving") setStatus("idle");
            }}
            onBlur={handleBlur}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/10 focus:border-emerald-600"
          />
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
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
    </div>
  );
}
