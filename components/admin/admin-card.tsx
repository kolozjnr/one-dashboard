import type { ReactNode } from "react";

export function AdminCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface p-4 ${className}`}><h2 className="mb-3 text-sm font-semibold">{title}</h2>{children}</section>;
}
