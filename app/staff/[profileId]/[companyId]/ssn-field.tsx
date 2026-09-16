"use client";

import { useRef, useState } from "react";
import { formatSSN } from "@/lib/masked-input";
import { updateStaffCompanyField } from "./actions";
import type { RevealResult } from "@/lib/ssn-reveal";

// Masked by default - the actual SSN never reaches the browser until
// Reveal is clicked, which round-trips through the server action (logged,
// fails closed on a log-write failure). Auto re-masks after 20s. "Replace"
// skips the reveal entirely for a blind overwrite - typing a brand new
// value doesn't require reading the old one, and isn't a "reveal" since
// nothing is read.
const AUTO_HIDE_MS = 20000;

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

export function SsnField({
  companyId,
  ghlFieldId,
  dbColumn,
  label,
  hasValue,
  onReveal,
}: {
  companyId: string;
  ghlFieldId: string;
  dbColumn: string;
  label: string;
  hasValue: boolean;
  // Owner and staff each call their own portal's revealSsn action (tagged
  // "owner"/"team" in the audit log) - unlike the save path below, which is
  // genuinely the same underlying action for both, this one needs to know
  // which portal it's being rendered from, so it's a prop rather than an
  // import fixed to this file's own location.
  onReveal: (companyId: string) => Promise<RevealResult>;
}) {
  const [mode, setMode] = useState<"masked" | "revealed" | "editing">(hasValue ? "masked" : "editing");
  const [value, setValue] = useState("");
  const [savedValue, setSavedValue] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearHideTimer() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }

  async function handleReveal() {
    setRevealing(true);
    setError(null);
    const result = await onReveal(companyId);
    setRevealing(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue(result.value);
    setSavedValue(result.value);
    setStatus(result.value ? "saved" : "idle");
    setMode("revealed");
    clearHideTimer();
    hideTimer.current = setTimeout(() => setMode("masked"), AUTO_HIDE_MS);
  }

  function handleHide() {
    clearHideTimer();
    setMode("masked");
  }

  function handleStartReplace() {
    clearHideTimer();
    setValue("");
    setSavedValue("");
    setStatus("idle");
    setError(null);
    setMode("editing");
  }

  async function save(next: string) {
    if (next === savedValue) return;
    setStatus("saving");
    setError(null);
    const result = await updateStaffCompanyField(companyId, ghlFieldId, dbColumn, next);
    if (result.ok) {
      setSavedValue(next);
      setStatus("saved");
      clearHideTimer();
      setMode("masked");
    } else {
      setStatus("error");
      setError(result.error ?? "Failed to save");
    }
  }

  return (
    <div className="py-2.5">
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-600 w-48 shrink-0">{label}</label>
        <div className="flex-1 flex items-center gap-2">
          {mode === "masked" && (
            <>
              <input
                type="password"
                value="•••-••-••••"
                readOnly
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50 text-slate-400"
              />
              <button
                type="button"
                onClick={handleReveal}
                disabled={revealing}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {revealing ? "Revealing..." : "Reveal"}
              </button>
              <button
                type="button"
                onClick={handleStartReplace}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Replace
              </button>
            </>
          )}
          {(mode === "revealed" || mode === "editing") && (
            <>
              <input
                type="text"
                inputMode="numeric"
                placeholder="###-##-####"
                value={value}
                onChange={(e) => {
                  setValue(formatSSN(e.target.value));
                  if (status !== "saving") setStatus("idle");
                }}
                onBlur={() => save(value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/10 focus:border-emerald-600"
              />
              {mode === "revealed" && (
                <button
                  type="button"
                  onClick={handleHide}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Hide
                </button>
              )}
              <SaveBadge status={status} />
            </>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-1 ml-[13.5rem]">{error}</p>}
    </div>
  );
}
