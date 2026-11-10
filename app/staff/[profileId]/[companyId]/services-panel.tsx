"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addCompanyService } from "./services-actions";
import { ServiceRow, type ServiceRecord, type ServiceDocRecord } from "./service-row";
import { SERVICE_TYPES, SERVICE_TYPES_WITHOUT_DEADLINE, DBPR_LICENSE_TYPES, type ServiceTypeKey } from "@/lib/services";
import { suggestedServiceDeadline } from "@/lib/service-deadlines";
import { EmptyState } from "@/components/console/ui";

export function ServicesPanel({
  companyId,
  services,
  documentsByService,
  availableTags,
  activeTags,
  basePath,
}: {
  companyId: string;
  services: ServiceRecord[];
  documentsByService: Record<string, ServiceDocRecord[]>;
  availableTags: string[];
  activeTags: string[]; // lower-cased, from ?tag=
  basePath: string; // this company page's own path, for filter links
}) {
  const router = useRouter();
  const [newTags, setNewTags] = useState<string[]>([]);
  const [serviceType, setServiceType] = useState<ServiceTypeKey>("dbpr_license");
  const [subtype, setSubtype] = useState<string>(DBPR_LICENSE_TYPES[0]);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [deadline, setDeadline] = useState(suggestedServiceDeadline("dbpr_license") ?? "");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTypeChange(next: ServiceTypeKey) {
    setServiceType(next);
    setDeadline(suggestedServiceDeadline(next) ?? "");
  }

  async function handleAdd() {
    setAdding(true);
    setError(null);
    const result = await addCompanyService({
      companyId,
      serviceType,
      subtype: serviceType === "dbpr_license" ? subtype : undefined,
      licenseNumber: licenseNumber || undefined,
      deadlineDate: deadline || undefined,
      tags: newTags,
    });
    setAdding(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setLicenseNumber("");
    setNewTags([]);
    router.refresh();
  }

  const shown =
    activeTags.length > 0
      ? services.filter((s) => (s.tags ?? []).some((t) => activeTags.includes(t.toLowerCase())))
      : services;
  const active = shown.filter((s) => s.status === "Active");
  const inactive = shown.filter((s) => s.status === "Inactive");

  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Services (DBPR, Corp Renewal, Food Permit, Sales Tax Cert, EBT)</h3>
        <span className="hint">{active.length} active</span>
      </header>

      {availableTags.length > 0 && (
        <div style={{ padding: "12px 15px", borderBottom: "1px solid var(--rule-soft)" }}>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>
            Filter by tag - matches any selected
            {activeTags.length > 0 && (
              <>
                {" · "}
                <Link href={basePath}>clear</Link>
              </>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {availableTags.map((t) => {
              const on = activeTags.includes(t.toLowerCase());
              const next = on ? activeTags.filter((a) => a !== t.toLowerCase()) : [...activeTags, t.toLowerCase()];
              const params = new URLSearchParams();
              for (const n of next) params.append("tag", n);
              const qs = params.toString();
              return (
                <Link
                  key={t}
                  href={qs ? `${basePath}?${qs}` : basePath}
                  className="ctag"
                  style={{
                    background: on ? "var(--green-soft, #e4efe9)" : undefined,
                    borderColor: on ? "var(--green)" : undefined,
                  }}
                >
                  {on ? "✓ " : ""}
                  {t}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ padding: "12px 15px" }}>
        {services.length === 0 && <EmptyState title="No additional services tracked yet" />}
        {services.length > 0 && shown.length === 0 && <EmptyState title="No services match the selected tags" />}
        {[...active, ...inactive].map((s) => (
          <ServiceRow key={s.id} service={s} documents={documentsByService[s.id] ?? []} availableTags={availableTags} />
        ))}
      </div>

      <div style={{ padding: "12px 15px", borderTop: "1px solid var(--rule-soft)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
            onChange={(e) => setSubtype(e.target.value)}
            style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          >
            {DBPR_LICENSE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          placeholder={serviceType === "ebt" ? "Account Number" : "License #"}
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          style={{ width: 130, fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        />

        {!SERVICE_TYPES_WITHOUT_DEADLINE.has(serviceType) && (
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          />
        )}

        <button onClick={handleAdd} disabled={adding} className="cbtn">
          {adding ? "Adding..." : "+ Add service"}
        </button>

        {availableTags.length > 0 && (
          <div style={{ flexBasis: "100%", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {availableTags.map((t) => {
              const on = newTags.includes(t);
              return (
                <button
                  type="button"
                  key={t}
                  className="ctag"
                  onClick={() => setNewTags(on ? newTags.filter((x) => x !== t) : [...newTags, t])}
                  style={{
                    cursor: "pointer",
                    background: on ? "var(--green-soft, #e4efe9)" : undefined,
                    borderColor: on ? "var(--green)" : undefined,
                  }}
                >
                  {on ? "✓ " : "+ "}
                  {t}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", padding: "0 15px 10px" }}>{error}</p>}
    </div>
  );
}
