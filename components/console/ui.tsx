import Link from "next/link";

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const TONES = ["g", "b", "a", "r"] as const;
export type Tone = (typeof TONES)[number];

// Deterministic tone from an id so the same person always gets the same color.
export function toneFor(id: string): Tone {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

export function Avatar({ name, id, size = "md" }: { name: string; id: string; size?: "sm" | "md" | "lg" }) {
  const tone = toneFor(id);
  const style = size === "lg" ? { width: 52, height: 52, fontSize: 16 } : size === "sm" ? { width: 30, height: 30, fontSize: 11 } : undefined;
  return (
    <div className={`av ${tone}`} style={style}>
      {initialsFor(name)}
    </div>
  );
}

export function MultiEntityBadge({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <span className="stack">
      <span className="bars">
        <i />
        <i />
        <i />
      </span>
      {count} entities
    </span>
  );
}

export function Pill({ children, variant = "n", dot = true }: { children: React.ReactNode; variant?: "g" | "a" | "r" | "b" | "n"; dot?: boolean }) {
  return <span className={`cpill ${variant}`} style={dot ? undefined : { paddingLeft: 8 }}>{children}</span>;
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="ctag">{children}</span>;
}

export function StatCard({
  k,
  v,
  d,
}: {
  k: string;
  v: string | number;
  d?: React.ReactNode;
}) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {d && <div className="d">{d}</div>}
    </div>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="cempty">
      <b>{title}</b>
      {subtitle}
    </div>
  );
}

export function ConsoleTopBar({
  crumbs,
  searchAction,
  searchDefault,
  searchPlaceholder = "Search contacts, entities, EINs...",
  actions,
}: {
  crumbs: { label: string; href?: string }[];
  searchAction?: string;
  searchDefault?: string;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="top">
      <div className="crumb">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            {i > 0 && <span className="sep">/</span>}
            {c.href ? <Link href={c.href}>{c.label}</Link> : <b>{c.label}</b>}
          </span>
        ))}
      </div>
      {searchAction && (
        <form action={searchAction} method="get" className="search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input name="q" defaultValue={searchDefault} placeholder={searchPlaceholder} />
        </form>
      )}
      {actions}
    </div>
  );
}

export function StageProgress({ stages, currentIndex }: { stages: string[]; currentIndex: number }) {
  return (
    <div className="stageline">
      {stages.map((s, i) => (
        <div key={s} className={`stagestep ${i < currentIndex ? "done" : i === currentIndex ? "current" : ""}`}>
          <div className="bar" />
          <div className="lbl">{s}</div>
        </div>
      ))}
    </div>
  );
}
