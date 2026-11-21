import type { ReactNode } from "react";

export function AdminPageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 text-xs font-medium text-faint">Platform administration <span className="mx-1.5">·</span> {title}</div><h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1><p className="mt-1 text-sm text-muted">{description}</p></div>{action}</div>;
}
