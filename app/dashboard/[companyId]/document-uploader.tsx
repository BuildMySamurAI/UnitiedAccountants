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
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
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
          <label
            className={`inline-flex items-center gap-1.5 text-sm font-medium cursor-pointer shrink-0 ml-3 transition-colors ${
              uploading ? "text-slate-400" : "text-emerald-700 hover:text-emerald-800"
            }`}
          >
            {uploading && (
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
              </svg>
            )}
            {uploading ? "Uploading..." : hasFiles ? "+ Add another" : "Upload"}
            <input type="file" onChange={handleFileChange} disabled={uploading} className="hidden" />
          </label>
        </div>

        {hasFiles && (
          <ul className="mt-2 space-y-1.5">
            {existing.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 text-sm bg-slate-50 rounded-lg px-3 py-1.5"
              >
                <span className="text-slate-600 truncate">{f.file_name}</span>
                <button
                  onClick={() => handleView(f.storage_path)}
                  className="text-emerald-700 hover:text-emerald-800 hover:underline shrink-0 font-medium"
                >
                  View
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-sm text-red-600 mt-1.5">{error}</p>}
      </div>
    </div>
  );
}
