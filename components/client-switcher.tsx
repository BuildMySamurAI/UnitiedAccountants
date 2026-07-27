"use client";

import { useRouter } from "next/navigation";

export function ClientSwitcher({
  clients,
  activeId,
  basePath,
}: {
  clients: { id: string; label: string }[];
  activeId: string;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <select
      value={activeId}
      onChange={(e) => router.push(`${basePath}/${e.target.value}`)}
      className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/10 focus:border-emerald-600"
    >
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
