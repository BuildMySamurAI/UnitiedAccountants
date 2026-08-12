"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { recordServiceDocumentUpload, getServiceDocumentUrl } from "./services-actions";

type ExistingDoc = {
  id: string;
  year: number;
  file_name: string;
  storage_path: string;
};

export function ServiceDocumentUploader({
  companyId,
  serviceId,
  existing,
}: {
  companyId: string;
  serviceId: string;
  existing: ExistingDoc[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const storagePath = `${companyId}/services/${serviceId}/${year}/${Date.now()}-${file.name}`;
    const supabase = supabaseBrowser();
    const { error: uploadError } = await supabase.storage.from("company-files").upload(storagePath, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const result = await recordServiceDocumentUpload({ serviceId, companyId, year, storagePath, fileName: file.name });
    if (!result.ok) {
      setError(result.error);
      setUploading(false);
      return;
    }

    setUploading(false);
    e.target.value = "";
    router.refresh();
  }

  async function handleView(storagePath: string) {
    const url = await getServiceDocumentUrl(storagePath);
    if (url) window.open(url, "_blank");
  }

  const byYear = [...existing].sort((a, b) => b.year - a.year);
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <div style={{ padding: "10px 0 2px" }}>
      {byYear.length === 0 && <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "0 0 8px" }}>No documents uploaded yet.</p>}
      {byYear.map((d) => (
        <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "4px 0" }}>
          <span style={{ fontSize: 12.5 }}>
            <b style={{ fontFamily: "var(--console-font-mono)" }}>{d.year}</b> - {d.file_name}
          </span>
          <button onClick={() => handleView(d.storage_path)} className="cbtn ghost" style={{ padding: "3px 9px", fontSize: 11 }}>
            View
          </button>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="cbtn ghost" style={{ padding: "4px 8px", fontSize: 11 }}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <label className="cbtn" style={{ cursor: "pointer", fontSize: 11, padding: "4px 10px" }}>
          {uploading ? "Uploading..." : "Upload for this year"}
          <input type="file" onChange={handleFileChange} disabled={uploading} style={{ display: "none" }} />
        </label>
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 4 }}>{error}</p>}
    </div>
  );
}
