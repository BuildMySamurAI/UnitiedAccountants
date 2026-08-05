import Link from "next/link";
import LogoutButton from "@/app/dashboard/logout-button";

function initialsFor(label: string) {
  const namePart = label.split("@")[0].replace(/[._-]+/g, " ").trim();
  const parts = namePart.split(" ").filter(Boolean);
  const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : namePart.slice(0, 2);
  return initials.toUpperCase();
}

export function Header({ userLabel, subtitle = "Client Portal" }: { userLabel?: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-5xl px-6 py-3.5 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-sm font-semibold shadow-sm shadow-emerald-900/20 transition-transform group-hover:scale-[1.04]">
            UA
          </span>
          <span>
            <span className="block font-semibold text-slate-900 leading-tight tracking-tight">
              United Accountants
            </span>
            <span className="block text-xs text-slate-500 leading-tight">{subtitle}</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {userLabel && (
            <div className="hidden sm:flex items-center gap-2.5 pr-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                {initialsFor(userLabel)}
              </span>
              <span className="text-sm text-slate-600">{userLabel}</span>
            </div>
          )}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
