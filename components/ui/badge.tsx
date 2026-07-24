const variants = {
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-blue-50 text-blue-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
};

export function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

const STAGE_VARIANT: Record<string, keyof typeof variants> = {
  "Client Onboarding": "info",
  "Sunbiz Filed": "info",
  "EIN Applied": "info",
  "Tax Registrations In Progress": "warning",
  "QC Review": "warning",
  "Active Client": "success",
};

export function StageBadge({ stage }: { stage: string | null }) {
  if (!stage) return <Badge>Unknown</Badge>;
  return <Badge variant={STAGE_VARIANT[stage] ?? "neutral"}>{stage}</Badge>;
}
