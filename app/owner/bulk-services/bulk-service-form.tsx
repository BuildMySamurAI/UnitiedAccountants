"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkAddCompanyServices } from "./actions";
import { SERVICE_TYPES, DBPR_LICENSE_TYPES, type ServiceTypeKey } from "@/lib/services";
import { suggestedServiceDeadline } from "@/lib/service-deadlines";

type Company = { id: string; businessName: string; clientName: string };
type ExistingService = { company_id: string; service_type: string; subtype: string | null; status: string };

export function BulkServiceForm({ companies, existingServices }: { companies: Company[]; existingServices: ExistingService[] }) {
  const router = useRouter();
  const [serviceType, setServiceType] = useState<ServiceTypeKey>("dbpr_license");
  const [subtype, setSubtype] = useState<string>(DBPR_LICENSE_TYPES[0]);
  const [deadline, setDeadline] = useState(suggestedServiceDeadline("dbpr_license") ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleTypeChange(next: ServiceTypeKey) {
    setServiceType(next);
    setDeadline(suggestedServiceDeadline(next) ?? "");
    setSelected(new Set());
  }

  const activeSubtype = serviceType === "dbpr_license" ? subtype : null;

  const alreadyHave = useMemo(() => {
    const ids = new Set<string>();
    for (const s of existingServices) {
      if (s.status !== "Active" || s.service_type !== serviceType) continue;
      if ((s.subtype ?? null) !== activeSubtype) continue;
      ids.add(s.company_id);
    }
    return ids;
  }, [existingServices, serviceType, activeSubtype]);

  const eligible = companies.filter((c) => !alreadyHave.has(c.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllEligible() {
    setSelected(new Set(eligible.map((c) => c.id)));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    const res = await bulkAddCompanyServices({
      companyIds: [...selected],
      serviceType,
      subtype: activeSubtype || undefined,
      deadlineDate: deadline || undefined,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(`Added to ${res.created} compan${res.created === 1 ? "y" : "ies"}.`);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="ccard">
      <header>
        <h3>Create deadlines in bulk</h3>
      </header>

      <div style={{ padding: "14px 15px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid var(--rule-soft)" }}>
        <select
          value={serviceType}
          onChange={(e) => handleTypeChange(e.target.value as ServiceTypeKey)}
          style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        >
          {SERVICE_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>

        {serviceType === "dbpr_license" && (
          <select
            value={subtype}
            onChange={(e) => {
              setSubtype(e.target.value);
              setSelected(new Set());
            }}
            style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          >
            {DBPR_LICENSE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}

        <label style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
          Deadline (optional, applies to all selected)
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          />
        </label>
      </div>

      <div style={{ padding: "10px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--rule-soft)" }}>
        <span className="hint">
          {selected.size} selected · {eligible.length} eligible · {alreadyHave.size} already have this service
        </span>
        <button onClick={selectAllEligible} className="cbtn ghost" style={{ fontSize: 11, padding: "5px 10px" }}>
          Select all eligible
        </button>
      </div>

      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {companies.map((c) => {
          const disabled = alreadyHave.has(c.id);
          return (
            <label
              key={c.id}
              className="rl"
              style={{ cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1 }}
            >
              <input type="checkbox" checked={selected.has(c.id)} disabled={disabled} onChange={() => toggle(c.id)} style={{ marginRight: 10 }} />
              <div>
                <div className="x">
                  <b>{c.businessName}</b> - {c.clientName}
                </div>
                {disabled && <div className="y">Already has this service</div>}
              </div>
            </label>
          );
        })}
      </div>

      <div style={{ padding: "12px 15px", borderTop: "1px solid var(--rule-soft)" }}>
        <button onClick={handleSubmit} disabled={submitting || selected.size === 0} className="cbtn">
          {submitting ? "Adding..." : `Add to ${selected.size} compan${selected.size === 1 ? "y" : "ies"}`}
        </button>
        {result && <p style={{ fontSize: 12, color: "var(--green)", marginTop: 8 }}>{result}</p>}
        {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  );
}
