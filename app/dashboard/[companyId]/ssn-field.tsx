"use client";

import { useRef, useState } from "react";
import { updateCompanyField, revealSsn } from "./actions";
import { formatSSN } from "@/lib/masked-input";

const STATUS_LABEL = { idle: "Unsaved", saving: "Saving...", saved: "Saved", error: "Error" } as const;
const STATUS_VARIANT = { idle: "n", saving: "n", saved: "g", error: "r" } as const;
const AUTO_HIDE_MS = 20000;

const inputStyle = {
  flex: 1,
  padding: "8px 11px",
  border: "1px solid var(--rule)",
  borderRadius: 7,
  font: "inherit",
  fontSize: 13,
  background: "#fff",
  color: "var(--ink)",
} as const;

const buttonStyle = {
  padding: "8px 11px",
  border: "1px solid var(--rule)",
  borderRadius: 7,
  font: "inherit",
  fontSize: 12,
  background: "#fff",
  color: "var(--ink-2)",
  cursor: "pointer",
  whiteSpace: "nowrap",
} as const;

// Masked by default, matching the same protection as the staff/owner side -
// the SSN never reaches the browser until Reveal is clicked (logged, fails
// closed on a log-write failure), auto re-masks after 20s. "Replace" skips
// the reveal for a blind overwrite, since typing a new value doesn't
// require reading the old one first.
export function SsnField({
  companyId,
  label,
  hasValue,
  placeholder,
}: {
  companyId: string;
  label: string;
  hasValue: boolean;
  placeholder?: string;
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
    const result = await revealSsn(companyId);
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
    const result = await updateCompanyField(companyId, "ssn", next);
    if (result.ok) {
      setSavedValue(next);
      setStatus("saved");
      clearHideTimer();
      setMode("masked");
    } else {
      setStatus("error");
      setError(result.error);
    }
  }

  return (
    <div style={{ padding: "12px 15px", borderBottom: "1px solid var(--rule-soft)" }}>
      <label className="fact" style={{ display: "block", padding: 0, border: "none" }}>
        <span className="k">{label}</span>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        {mode === "masked" && (
          <>
            <input value="•••-••-••••" readOnly style={{ ...inputStyle, color: "var(--ink-3)" }} />
            <button type="button" onClick={handleReveal} disabled={revealing} style={buttonStyle}>
              {revealing ? "Revealing..." : "Reveal"}
            </button>
            <button type="button" onClick={handleStartReplace} style={buttonStyle}>
              Replace
            </button>
          </>
        )}
        {(mode === "revealed" || mode === "editing") && (
          <>
            <input
              value={value}
              placeholder={placeholder}
              inputMode="numeric"
              onChange={(e) => {
                setValue(formatSSN(e.target.value));
                if (status !== "saving") setStatus("idle");
              }}
              onBlur={() => save(value)}
              style={inputStyle}
            />
            {mode === "revealed" && (
              <button type="button" onClick={handleHide} style={buttonStyle}>
                Hide
              </button>
            )}
            <span className={`cpill ${STATUS_VARIANT[status]}`}>{STATUS_LABEL[status]}</span>
          </>
        )}
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6 }}>{error}</p>}
    </div>
  );
}
