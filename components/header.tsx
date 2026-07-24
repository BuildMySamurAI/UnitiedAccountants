import Link from "next/link";
import LogoutButton from "@/app/dashboard/logout-button";

export function Header({ userLabel, subtitle = "Client Portal" }: { userLabel?: string; subtitle?: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white text-sm font-semibold">
            UA
          </span>
          <span>
            <span className="block font-semibold text-slate-900 leading-tight">United Accountants</span>
            <span className="block text-xs text-slate-500 leading-tight">{subtitle}</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {userLabel && <span className="text-sm text-slate-600">{userLabel}</span>}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
