"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addCompanyService } from "./services-actions";
import { ServiceRow, type ServiceRecord, type ServiceDocRecord } from "./service-row";
import { SERVICE_TYPES, DBPR_LICENSE_TYPES, type ServiceTypeKey } from "@/lib/services";
import { suggestedServiceDeadline } from "@/lib/service-deadlines";
import { EmptyState } from "@/components/console/ui";

export function ServicesPanel({
  companyId,
  services,
  documentsByService,
}: {
  companyId: string;
  services: ServiceRecord[];
  documentsByService: Record<string, ServiceDocRecord[]>;
}) {
  const router = useRouter();
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
    });
    setAdding(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setLicenseNumber("");
    router.refresh();
  }

  const active = services.filter((s) => s.status === "Active");
  const inactive = services.filter((s) => s.status === "Inactive");

  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Services (DBPR, Corp Renewal, Food Permit, Sales Tax Cert)</h3>
        <span className="hint">{active.length} active</span>
      </header>

      <div style={{ padding: "12px 15px" }}>
        {services.length === 0 && <EmptyState title="No additional services tracked yet" />}
        {[...active, ...inactive].map((s) => (
          <ServiceRow key={s.id} service={s} documents={documentsByService[s.id] ?? []} />
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
          placeholder="License #"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          style={{ width: 130, fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        />

        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        />

        <button onClick={handleAdd} disabled={adding} className="cbtn">
          {adding ? "Adding..." : "+ Add service"}
        </button>
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", padding: "0 15px 10px" }}>{error}</p>}
    </div>
  );
}
