import Link from "next/link";

export function CompanyTabs({
  companies,
  activeId,
  hrefFor,
}: {
  companies: { id: string; business_name: string | null }[];
  activeId: string;
  hrefFor: (companyId: string) => string;
}) {
  if (companies.length <= 1) return null;

  return (
    <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
      {companies.map((c) => {
        const active = c.id === activeId;
        return (
          <Link
            key={c.id}
            href={hrefFor(c.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              active
                ? "border-emerald-700 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {c.business_name ?? "Untitled company"}
          </Link>
        );
      })}
    </div>
  );
}
