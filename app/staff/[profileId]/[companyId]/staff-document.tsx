"use client";

import { useState } from "react";
import { uploadStaffDocument } from "./actions";

export function StaffDocument({
  companyId,
  ghlFieldId,
  label,
  initialUrl,
}: {
  companyId: string;
  ghlFieldId: string;
  label: string;
  initialUrl?: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadStaffDocument(companyId, ghlFieldId, formData);

    if (!result.ok) {
      setError(result.error);
      setUploading(false);
      return;
    }

    // GHL's media URL is deterministic from the upload response, but we don't
    // get it back from the server action - simplest correct thing is to just
    // reflect that a file now exists and let the next full page load pick up
    // the real URL. Until then, disable further changes to avoid confusion.
    setUploading(false);
    setUrl("uploaded");
    e.target.value = "";
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-slate-600 w-48 shrink-0">{label}</span>
      <div className="flex-1 flex items-center justify-between gap-3">
        {url ? (
          url === "uploaded" ? (
            <span className="text-sm text-slate-400">Uploaded - refresh to view</span>
          ) : (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-700 hover:underline">
              View
            </a>
          )
        ) : (
          <span className="text-sm text-slate-400">Not yet uploaded</span>
        )}
        <label className="text-sm font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer shrink-0">
          {uploading ? "Uploading..." : url ? "Replace" : "Upload"}
          <input type="file" onChange={handleFileChange} disabled={uploading} className="hidden" />
        </label>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
