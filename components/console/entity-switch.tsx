import Link from "next/link";

function flagFor(stage: string | null): "ok" | "soon" | "due" {
  if (stage === "Active Client") return "ok";
  if (stage === "QC Review" || stage === "Tax Registrations In Progress") return "soon";
  return "due";
}

export function EntitySwitch({
  ownerName,
  companies,
  activeId,
  hrefFor,
}: {
  ownerName: string;
  companies: { id: string; business_name: string | null; pipeline_stage: string | null }[];
  activeId: string;
  hrefFor: (companyId: string) => string;
}) {
  if (companies.length <= 1) return null;

  return (
    <div className="switch">
      <div className="hd">
        Companies under <b>{ownerName}</b> - pick one to scope everything below
      </div>
      <div className="ents">
        {companies.map((c) => {
          const active = c.id === activeId;
          return (
            <Link key={c.id} href={hrefFor(c.id)} className={`ent ${active ? "on" : ""}`}>
              <span className={`ei ${flagFor(c.pipeline_stage)}`} />
              <div className="en">{c.business_name ?? "Untitled company"}</div>
              <div className="em">{c.pipeline_stage ?? "Unknown stage"}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
