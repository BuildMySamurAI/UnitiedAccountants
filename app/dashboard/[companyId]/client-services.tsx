import { ServiceDocumentUploader } from "@/app/staff/[profileId]/[companyId]/service-document-uploader";
import type { ServiceDocRecord, ServiceRecord } from "@/app/staff/[profileId]/[companyId]/service-row";
import { SERVICE_TYPE_LABEL } from "@/lib/services";
import { EmptyState } from "@/components/console/ui";

// Client view is read-only on the service details (type, license #,
// deadline, status) - only staff/owner set those. Clients can still upload
// documents to their own active services (Food Permit, DBPR licenses, etc.),
// same as they already can for formation/bookkeeping documents.
export function ClientServices({
  services,
  documentsByService,
}: {
  services: ServiceRecord[];
  documentsByService: Record<string, ServiceDocRecord[]>;
}) {
  const active = services.filter((s) => s.status === "Active");

  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Licenses &amp; Permits</h3>
        <span className="hint">{active.length} active</span>
      </header>
      <div style={{ padding: "4px 15px" }}>
        {active.length === 0 && <EmptyState title="Nothing tracked here yet" />}
        {active.map((s) => {
          const title = s.subtype ? `${SERVICE_TYPE_LABEL[s.service_type]} - ${s.subtype}` : SERVICE_TYPE_LABEL[s.service_type];
          return (
            <div key={s.id} style={{ borderBottom: "1px solid var(--rule-soft)", padding: "12px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
                <b style={{ fontSize: 13 }}>{title}</b>
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  {s.license_number ? `#${s.license_number} - ` : ""}
                  {s.deadline_date ? `due ${new Date(s.deadline_date).toLocaleDateString()}` : "no deadline set"}
                </span>
              </div>
              <ServiceDocumentUploader companyId={s.company_id} serviceId={s.id} existing={documentsByService[s.id] ?? []} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
