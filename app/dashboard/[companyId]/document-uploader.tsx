"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { recordDocumentUpload, getSignedDownloadUrl } from "./actions";

type ExistingFile = {
  id: string;
  field_key: string;
  file_name: string;
  storage_path: string;
  uploaded_at: string;
};

export default function DocumentUploader({
  companyId,
  fieldKey,
  label,
  existing,
}: {
  companyId: string;
  fieldKey: string;
  label: string;
  existing: ExistingFile[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const storagePath = `${companyId}/${fieldKey}/${Date.now()}-${file.name}`;
    const supabase = supabaseBrowser();

    const { error: uploadError } = await supabase.storage.from("company-files").upload(storagePath, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const result = await recordDocumentUpload(companyId, fieldKey, storagePath, file.name);
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
    const url = await getSignedDownloadUrl(storagePath);
    if (url) window.open(url, "_blank");
  }

  const hasFiles = existing.length > 0;

  return (
    <div className={`doc ${hasFiles ? "have" : "miss"}`}>
      <div className="ic">{hasFiles ? "PDF" : "-"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="nm">{label}</div>
        {hasFiles ? (
          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
            {existing.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span className="mt" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.file_name}
                </span>
                <button onClick={() => handleView(f.storage_path)} className="cbtn ghost" style={{ flexShrink: 0, padding: "3px 9px", fontSize: 11 }}>
                  View
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt">Not yet uploaded</div>
        )}
        {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 4 }}>{error}</p>}
      </div>
      <div className="rt">
        <label className="cbtn" style={{ cursor: "pointer" }}>
          {uploading ? "Uploading..." : hasFiles ? "+ Add another" : "Upload"}
          <input type="file" onChange={handleFileChange} disabled={uploading} style={{ display: "none" }} />
        </label>
      </div>
    </div>
  );
}
