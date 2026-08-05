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
    <div className="relative">
      <select
        value={activeId}
        onChange={(e) => router.push(`${basePath}/${e.target.value}`)}
        className="appearance-none rounded-lg border border-slate-300 pl-3.5 pr-9 py-2.5 text-sm bg-white text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-700/10 focus:border-emerald-600"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
