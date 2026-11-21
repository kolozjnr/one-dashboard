"use client";

export function AdminToast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[60] flex max-w-[calc(100vw-2.5rem)] items-start gap-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-xl">
    <span>{message}</span>
    <button type="button" aria-label="Dismiss notification" onClick={onClose} className="shrink-0 text-muted hover:text-ink">×</button>
  </div>;
}
