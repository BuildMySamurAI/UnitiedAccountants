"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCompanyService } from "./services-actions";
import { ServiceDocumentUploader } from "./service-document-uploader";
import { SERVICE_TYPE_LABEL } from "@/lib/services";
import type { ServiceTypeKey } from "@/lib/services";

export type ServiceRecord = {
  id: string;
  company_id: string;
  service_type: ServiceTypeKey;
  subtype: string | null;
  license_number: string | null;
  deadline_date: string | null;
  status: "Active" | "Inactive";
};

export type ServiceDocRecord = { id: string; service_id: string; year: number; file_name: string; storage_path: string };

export function ServiceRow({ service, documents }: { service: ServiceRecord; documents: ServiceDocRecord[] }) {
  const router = useRouter();
  const [deadline, setDeadline] = useState(service.deadline_date ?? "");
  const [licenseNumber, setLicenseNumber] = useState(service.license_number ?? "");
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(fields: Parameters<typeof updateCompanyService>[1]) {
    setSaving(true);
    await updateCompanyService(service.id, fields);
    setSaving(false);
    router.refresh();
  }

  const title = service.subtype ? `${SERVICE_TYPE_LABEL[service.service_type]} - ${service.subtype}` : SERVICE_TYPE_LABEL[service.service_type];

  return (
    <div style={{ borderBottom: "1px solid var(--rule-soft)", padding: "12px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13, flex: "1 1 200px" }}>{title}</b>

        <input
          type="text"
          placeholder="License #"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          onBlur={() => save({ licenseNumber })}
          style={{ width: 130, fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        />

        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          onBlur={() => save({ deadlineDate: deadline })}
          style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        />

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

      {expanded && <ServiceDocumentUploader companyId={service.company_id} serviceId={service.id} existing={documents} />}
    </div>
  );
}
