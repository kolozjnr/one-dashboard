import Link from "next/link";
import type { ReactNode } from "react";

export function PinnableMenuItem({ href, label, pinned, onToggle, active = false, onNavigate, children, className = "" }: {
  href: string;
  label: string;
  pinned: boolean;
  onToggle: () => void;
  active?: boolean;
  onNavigate?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return <div className={`group relative flex items-center ${className}`}>
    <Link href={href} onClick={onNavigate} title={label} className={`flex min-w-0 flex-1 items-center ${active ? "text-brand" : ""}`}>
      {children}<span className="truncate">{label}</span>
    </Link>
    <button type="button" onClick={onToggle} aria-label={`${pinned ? "Unpin" : "Pin"} ${label}`} aria-pressed={pinned} title={`${pinned ? "Unpin" : "Pin"} ${label}`} className={`ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs transition-opacity hover:bg-sunken hover:text-brand focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${pinned ? "text-brand opacity-100" : "text-faint opacity-0 group-hover:opacity-100"}`}>
      <svg viewBox="0 0 24 24" fill={pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M16 3l5 5-4 1-4 4 1 4-2 2-3-5-5-5 2-2 4 1 4-4zM9 15l-5 5"/></svg>
    </button>
  </div>;
}
