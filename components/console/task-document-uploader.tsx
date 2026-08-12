"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { recordTaskDocumentUpload, getTaskDocumentUrl } from "@/lib/tasks-actions";

type ExistingDoc = { id: string; file_name: string; storage_path: string };

// Only rendered for company-scoped tasks - the storage path has to start
// with a companyId to satisfy the existing team/owner Storage bucket
// policies, which check that prefix against assigned_team_member_id.
export function TaskDocumentUploader({ companyId, taskId, existing }: { companyId: string; taskId: string; existing: ExistingDoc[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const storagePath = `${companyId}/tasks/${taskId}/${Date.now()}-${file.name}`;
    const supabase = supabaseBrowser();
    const { error: uploadError } = await supabase.storage.from("company-files").upload(storagePath, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const result = await recordTaskDocumentUpload({ taskId, storagePath, fileName: file.name });
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
    const url = await getTaskDocumentUrl(storagePath);
    if (url) window.open(url, "_blank");
  }

  return (
    <div style={{ padding: "8px 0 0" }}>
      {existing.length === 0 && <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "0 0 6px" }}>No documents uploaded yet.</p>}
      {existing.map((d) => (
        <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "3px 0" }}>
          <span style={{ fontSize: 12.5 }}>{d.file_name}</span>
          <button onClick={() => handleView(d.storage_path)} className="cbtn ghost" style={{ padding: "3px 9px", fontSize: 11 }}>
            View
          </button>
        </div>
      ))}
      <label className="cbtn" style={{ cursor: "pointer", fontSize: 11, padding: "4px 10px", display: "inline-block", marginTop: 4 }}>
        {uploading ? "Uploading..." : "Upload document"}
        <input type="file" onChange={handleFileChange} disabled={uploading} style={{ display: "none" }} />
      </label>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 4 }}>{error}</p>}
    </div>
  );
}
