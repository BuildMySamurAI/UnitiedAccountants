"use client";

import { useState } from "react";
import { updateCompanyField, type EditableFieldKey } from "./actions";
import { formatEIN, formatSSN } from "@/lib/masked-input";

const STATUS_LABEL = { idle: "Unsaved", saving: "Saving...", saved: "Saved", error: "Error" } as const;
const STATUS_VARIANT = { idle: "n", saving: "n", saved: "g", error: "r" } as const;

// A plain function prop can't cross the server -> client boundary (this
// component is rendered from a Server Component page) - so the mask is
// selected by name here instead of being passed in directly.
const MASKS = { ein: formatEIN, ssn: formatSSN } as const;

export function AutoSaveField({
  companyId,
  fieldKey,
  label,
  initialValue,
  mask,
  placeholder,
}: {
  companyId: string;
  fieldKey: EditableFieldKey;
  label: string;
  initialValue: string;
  // SSN/EIN input mask (##-#######/###-##-####) - same formatter the
  // staff/owner side uses, so both sides save the identical hyphenated
  // format to GHL.
  mask?: keyof typeof MASKS;
  placeholder?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    initialValue ? "saved" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const format = mask ? MASKS[mask] : undefined;

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

  return (
    <div style={{ padding: "12px 15px", borderBottom: "1px solid var(--rule-soft)" }}>
      <label className="fact" style={{ display: "block", padding: 0, border: "none" }}>
        <span className="k">{label}</span>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <input
          value={value}
          placeholder={placeholder}
          inputMode={format ? "numeric" : undefined}
          onChange={(e) => {
            setValue(format ? format(e.target.value) : e.target.value);
            if (status !== "saving") setStatus("idle");
          }}
          onBlur={handleBlur}
          style={{
            flex: 1,
            padding: "8px 11px",
            border: "1px solid var(--rule)",
            borderRadius: 7,
            font: "inherit",
            fontSize: 13,
            background: "#fff",
            color: "var(--ink)",
          }}
        />
        <span className={`cpill ${STATUS_VARIANT[status]}`}>{STATUS_LABEL[status]}</span>
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6 }}>{error}</p>}
    </div>
  );
}
