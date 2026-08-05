import { ButtonHTMLAttributes } from "react";

const base =
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:pointer-events-none px-4 py-2.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 focus-visible:ring-offset-1";

const variants = {
  primary:
    "bg-emerald-700 text-white shadow-sm shadow-emerald-900/10 hover:bg-emerald-800 hover:shadow-md hover:shadow-emerald-900/15",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400",
  ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
