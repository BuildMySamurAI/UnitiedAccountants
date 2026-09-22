"use client";

import { useState } from "react";
import { processBulkImport, type BulkImportResult } from "./actions";
import { Pill } from "@/components/console/ui";

export function ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus("processing");
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const outcome = await processBulkImport(formData);
      setResult(outcome);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setStatus("idle");
    }
  }

  const imported = result?.results.filter((r) => r.status === "imported") ?? [];
  const skipped = result?.results.filter((r) => r.status === "skipped") ?? [];
  const failed = result?.results.filter((r) => r.status === "failed") ?? [];

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ fontSize: 13 }}
        />
        <button type="submit" className="cbtn" disabled={!file || status === "processing"}>
          {status === "processing" ? "Importing..." : "Upload & Import"}
        </button>
      </form>
      {status === "processing" && (
        <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 10 }}>
          Processing row by row - this can take a while for a large file, don't close this tab.
        </p>
      )}
      {error && <p style={{ fontSize: 12, color: "var(--red)", marginTop: 10 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <Pill variant="g">{imported.length} imported</Pill>
            <Pill variant="n">{skipped.length} skipped</Pill>
            <Pill variant="r">{failed.length + result.parseErrors.length} failed</Pill>
          </div>

          {(failed.length > 0 || result.parseErrors.length > 0 || skipped.length > 0) && (
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {result.parseErrors.map((e) => (
                  <tr key={`parse-${e.rowNumber}`}>
                    <td className="mono">{e.rowNumber}</td>
                    <td>-</td>
                    <td>
                      <Pill variant="r">Failed</Pill>
                    </td>
                    <td>{e.error}</td>
                  </tr>
                ))}
                {failed.map((r) => (
                  <tr key={`failed-${r.rowNumber}`}>
                    <td className="mono">{r.rowNumber}</td>
                    <td>
                      {r.businessName} ({r.email})
                    </td>
                    <td>
                      <Pill variant="r">Failed</Pill>
                    </td>
                    <td>{r.error}</td>
                  </tr>
                ))}
                {skipped.map((r) => (
                  <tr key={`skipped-${r.rowNumber}`}>
                    <td className="mono">{r.rowNumber}</td>
                    <td>
                      {r.businessName} ({r.email})
                    </td>
                    <td>
                      <Pill variant="n">Skipped</Pill>
                    </td>
                    <td>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
