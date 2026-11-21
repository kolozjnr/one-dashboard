import type { InputHTMLAttributes } from "react";

type AdminSearchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function AdminSearch({ className = "", ...props }: AdminSearchProps) {
  return <input type="search" className={`min-w-[220px] flex-1 rounded-lg border border-line bg-sunken px-3 py-2 text-xs outline-none focus:border-brand ${className}`} {...props} />;
}
