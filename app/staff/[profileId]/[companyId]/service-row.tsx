"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCompanyService } from "./services-actions";
import { ServiceDocumentUploader } from "./service-document-uploader";
import { SERVICE_TYPE_LABEL, SERVICE_TYPES_WITHOUT_DEADLINE } from "@/lib/services";
import type { ServiceTypeKey } from "@/lib/services";

export type ServiceRecord = {
  id: string;
  company_id: string;
  service_type: ServiceTypeKey;
  subtype: string | null;
  license_number: string | null;
  deadline_date: string | null;
  status: "Active" | "Inactive";
  tags?: string[]; // not selected on the client dashboard, which never shows tags
};

export type ServiceDocRecord = { id: string; service_id: string; year: number; file_name: string; storage_path: string };

export function ServiceRow({
  service,
  documents,
  availableTags,
}: {
  service: ServiceRecord;
  documents: ServiceDocRecord[];
  availableTags: string[];
}) {
  const router = useRouter();
  const [tagError, setTagError] = useState<string | null>(null);
  const currentTags = service.tags ?? [];
  const [deadline, setDeadline] = useState(service.deadline_date ?? "");
  const [licenseNumber, setLicenseNumber] = useState(service.license_number ?? "");
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(fields: Parameters<typeof updateCompanyService>[1]) {
    setSaving(true);
    const result = await updateCompanyService(service.id, fields);
    setSaving(false);
    setTagError(fields.tags !== undefined && !result.ok ? result.error : null);
    router.refresh();
  }

  function toggleTag(tag: string) {
    const on = currentTags.some((t) => t.toLowerCase() === tag.toLowerCase());
    const next = on ? currentTags.filter((t) => t.toLowerCase() !== tag.toLowerCase()) : [...currentTags, tag];
    save({ tags: next });
  }

  // Show approved tags plus any already-saved tag that has since left the list,
  // so it can still be seen and removed.
  const chipTags = [...availableTags, ...currentTags.filter((t) => !availableTags.some((a) => a.toLowerCase() === t.toLowerCase()))];

  const title = service.subtype ? `${SERVICE_TYPE_LABEL[service.service_type]} - ${service.subtype}` : SERVICE_TYPE_LABEL[service.service_type];

  return (
    <div style={{ borderBottom: "1px solid var(--rule-soft)", padding: "12px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13, flex: "1 1 200px" }}>{title}</b>

        <input
          type="text"
          placeholder={service.service_type === "ebt" ? "Account Number" : "License #"}
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          onBlur={() => save({ licenseNumber })}
          style={{ width: 130, fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        />

        {!SERVICE_TYPES_WITHOUT_DEADLINE.has(service.service_type) && (
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            onBlur={() => save({ deadlineDate: deadline })}
            style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
          />
        )}

        <select
          value={service.status}
          onChange={(e) => save({ status: e.target.value as "Active" | "Inactive" })}
          disabled={saving}
          className="cbtn ghost"
          style={{ fontSize: 11, padding: "5px 8px" }}
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <button onClick={() => setExpanded((v) => !v)} className="cbtn ghost" style={{ fontSize: 11, padding: "5px 10px" }}>
          {expanded ? "Hide documents" : `Documents (${documents.length})`}
        </button>
      </div>

      {chipTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {chipTags.map((t) => {
            const on = currentTags.some((c) => c.toLowerCase() === t.toLowerCase());
            return (
              <button
                type="button"
                key={t}
                className="ctag"
                disabled={saving}
                onClick={() => toggleTag(t)}
                style={{
                  cursor: "pointer",
                  background: on ? "var(--green-soft, #e4efe9)" : undefined,
                  borderColor: on ? "var(--green)" : undefined,
                }}
              >
                {on ? "✓ " : ""}
                {t}
              </button>
            );
          })}
        </div>
      )}
      {tagError && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6 }}>{tagError}</p>}

      {expanded && <ServiceDocumentUploader companyId={service.company_id} serviceId={service.id} existing={documents} />}
    </div>
  );
}
