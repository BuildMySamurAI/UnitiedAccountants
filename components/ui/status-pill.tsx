export type FieldStatus = "saved" | "saving" | "error" | "idle";

const STATUS_STYLE: Record<FieldStatus, string> = {
  saved: "bg-emerald-50 text-emerald-700",
  saving: "bg-slate-100 text-slate-500",
  error: "bg-red-50 text-red-600",
  idle: "bg-slate-50 text-slate-400",
};

const STATUS_DOT: Record<FieldStatus, string> = {
  saved: "bg-emerald-500",
  saving: "bg-slate-400 animate-pulse",
  error: "bg-red-500",
  idle: "bg-slate-300",
};

const STATUS_LABEL: Record<FieldStatus, string> = {
  saved: "Saved",
  saving: "Saving...",
  error: "Error",
  idle: "Unsaved",
};

export function StatusPill({ status }: { status: FieldStatus }) {
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${STATUS_STYLE[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
