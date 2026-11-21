"use client";

import { useCallback, useEffect, useState } from "react";

interface TourStep {
  target: string;
  title: string;
  summary: string;
}

const STEPS: TourStep[] = [
  { target: "[data-tour='dashboard-title']", title: "Dashboard overview", summary: "Your command center for the selected accounts and date range." },
  { target: "[data-tour='dashboard-actions']", title: "Dashboard actions", summary: "Share or export your dashboard, customize its widgets, or connect another source." },
  { target: "[data-tour='dashboard-filters']", title: "Filters", summary: "Choose the accounts and date range used throughout your dashboard." },
  { target: "[data-tour='dashboard-widgets']", title: "Your analytics", summary: "Explore the metrics and charts available for your connected accounts. Scroll to see each widget." },
  { target: "[data-tour='sidebar-navigation']", title: "Dashboard sections", summary: "Open Sources, Connections, Website Analytics, Audience Insights, Compare, Reports, Performance, Users, or Billing." },
  { target: "[data-tour='sidebar-account']", title: "Account links", summary: "Find Support, Settings, and your profile here." },
];

export function DashboardTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const start = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("metrispot-tour-start", start);
    // Always introduce the dashboard when it is opened; users can dismiss or replay it.
    start();
    return () => window.removeEventListener("metrispot-tour-start", start);
  }, []);

  const updateTarget = useCallback(() => {
    if (!open) return;
    const target = document.querySelector<HTMLElement>(STEPS[step].target);
    if (!target) {
      setTargetRect(null);
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    setTargetRect(target.getBoundingClientRect());
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(updateTarget);
    const onLayout = () => updateTarget();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open, updateTarget]);

  const dismiss = useCallback(() => setOpen(false), []);
  const go = useCallback((delta: number) => {
    setStep((current) => Math.min(STEPS.length - 1, Math.max(0, current + delta)));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismiss, go, open]);

  if (!open) return null;

  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const cardStyle = targetRect
    ? {
        top: Math.min(Math.max(16, targetRect.bottom + 14), window.innerHeight - 210),
        left: Math.min(Math.max(16, targetRect.left + targetRect.width / 2 - 160), window.innerWidth - 336),
      }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="fixed inset-0 z-[100]" aria-live="polite">
      <button type="button" aria-label="Close dashboard tour" onClick={dismiss} className="absolute inset-0 cursor-default bg-black/55" />
      {targetRect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-lg ring-4 ring-brand shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-all duration-300"
          style={{ top: targetRect.top - 6, left: targetRect.left - 6, width: targetRect.width + 12, height: targetRect.height + 12 }}
        />
      )}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-tour-title"
        className="absolute w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-5 text-ink shadow-2xl"
        style={cardStyle}
      >
        {targetRect && <div aria-hidden="true" className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-line bg-surface" />}
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-faint">Step {step + 1} of {STEPS.length}</span>
          <button type="button" onClick={dismiss} aria-label="Close dashboard tour" className="rounded p-1 text-faint hover:bg-sunken hover:text-ink">✕</button>
        </div>
        <h2 id="dashboard-tour-title" className="text-base font-semibold">{current.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{current.summary}</p>
        <div className="mt-5 flex items-center justify-between gap-2">
          <button type="button" onClick={dismiss} className="mr-auto text-sm text-faint hover:text-ink">Skip tour</button>
          <button type="button" onClick={() => go(-1)} disabled={step === 0} className="rounded-md border border-line-strong px-3 py-1.5 text-sm disabled:opacity-40">Back</button>
          <button type="button" onClick={() => (last ? dismiss() : go(1))} className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">{last ? "Finish" : "Next"}</button>
        </div>
      </section>
    </div>
  );
}
