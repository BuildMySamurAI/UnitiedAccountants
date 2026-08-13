"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setGoingOutOfBusiness } from "@/lib/company-lifecycle-actions";

export function GoingOutOfBusinessToggle({
  companyId,
  initialValue,
  createdBy,
}: {
  companyId: string;
  initialValue: string;
  createdBy: "team" | "client";
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue || "No");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: "Yes" | "No") {
    if (next === "Yes" && !window.confirm("Mark this company as going out of business? This creates the closing checklist (Company Dissolution, Sales Tax and RT Account Closure, DBPR Licenses Closure, Food Permit Closure) and switches E-File Sales Tax to Inactive.")) {
      return;
    }
    setSaving(true);
    setError(null);
    const result = await setGoingOutOfBusiness(companyId, next, createdBy);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue(next);
    router.refresh();
  }

  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Company going out of business?</h3>
      </header>
      <div style={{ padding: "14px 15px", display: "flex", alignItems: "center", gap: 10 }}>
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value as "Yes" | "No")}
          disabled={saving}
          style={{ fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--rule)" }}
        >
          <option value="No">No</option>
          <option value="Yes">Yes</option>
        </select>
        {value === "Yes" && (
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Closing checklist created - see Tasks below.</span>
        )}
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", padding: "0 15px 10px" }}>{error}</p>}
    </div>
  );
}
