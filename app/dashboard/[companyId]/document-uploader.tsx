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

    const { error: uploadError } = await supabase.storage
      .from("company-files")
      .upload(storagePath, file);

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
    <div className="flex items-start gap-3 py-4">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          hasFiles ? "bg-emerald-600 text-white" : "bg-slate-200"
        }`}
      >
        {hasFiles && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-800">{label}</span>
          <label className="text-sm font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer shrink-0 ml-3">
            {uploading ? "Uploading..." : hasFiles ? "+ Add another" : "Upload"}
            <input type="file" onChange={handleFileChange} disabled={uploading} className="hidden" />
          </label>
        </div>

        {hasFiles && (
          <ul className="mt-2 space-y-1">
            {existing.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-500 truncate">{f.file_name}</span>
                <button
                  onClick={() => handleView(f.storage_path)}
                  className="text-emerald-700 hover:underline shrink-0 ml-3"
                >
                  View
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </div>
    </div>
  );
}
