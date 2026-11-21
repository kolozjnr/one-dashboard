import type { ReactNode } from "react";

export function AdminDataTable({ headers, children, className = "" }: { headers: string[]; children: ReactNode; className?: string }) {
  return <div className="overflow-x-auto"><table className={`w-full text-left ${className}`}><thead className="bg-sunken text-[10px] uppercase text-faint"><tr>{headers.map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-line">{children}</tbody></table></div>;
}
