const variants = {
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-blue-50 text-blue-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
};

const dotVariants = {
  neutral: "bg-slate-400",
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
};

export function Badge({
  children,
  variant = "neutral",
  dot = false,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-black/[0.03] ${variants[variant]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotVariants[variant]}`} />}
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
  if (!stage) return <Badge dot>Unknown</Badge>;
  return (
    <Badge variant={STAGE_VARIANT[stage] ?? "neutral"} dot>
      {stage}
    </Badge>
  );
}
