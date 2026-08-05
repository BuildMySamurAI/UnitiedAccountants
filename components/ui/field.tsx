import { InputHTMLAttributes } from "react";

export function Field({
  label,
  required,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        required={required}
        className={`w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-700/10 focus:border-emerald-600 ${className}`}
        {...props}
      />
    </label>
  );
}
