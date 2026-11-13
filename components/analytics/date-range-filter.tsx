"use client";

import { useState } from "react";
import { useAnalytics } from "./analytics-context";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { DATE_PRESETS, rangeLabel } from "@/lib/analytics/date-ranges";
import { cn } from "@/lib/utils";

function toInputValue(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromInputValue(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/**
 * Date filter: seven presets plus a custom range editor. The chosen range
 * is shared through the analytics context so KPIs, charts, engagement,
 * content and website analytics all update together.
 */
export function DateRangeFilter() {
  const { range, setPreset, setCustomRange } = useAnalytics();
  const [open, setOpen] = useState(false);

  const applyCustom = (from: string, to: string) => {
    const fromDate = fromInputValue(from);
    const toDate = fromInputValue(to);
    if (!fromDate || !toDate) return;
    setCustomRange(
      fromDate,
      new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999),
    );
    setOpen(false);
  };

  const presets = DATE_PRESETS.filter((preset) => preset.id !== "custom");

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      align="start"
      panelClassName="w-[17rem]"
      trigger={
        <Button variant="outline" className="justify-between gap-3">
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 3v3m8-3v3M3.5 9.5h17M5 5.5h14a1.5 1.5 0 011.5 1.5v12A1.5 1.5 0 0119 20.5H5A1.5 1.5 0 013.5 19V7A1.5 1.5 0 015 5.5z"
              />
            </svg>
            {rangeLabel(range)}
          </span>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-ghost">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </Button>
      }
    >
      {open && (
        <div className="py-1">
          <ul>
            {presets.map((preset) => {
              const active = range.preset === preset.id;
              return (
                <li key={preset.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPreset(preset.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-sunken",
                      active ? "font-medium text-brand" : "text-muted",
                    )}
                  >
                    {preset.label}
                    {active && (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path
                          fillRule="evenodd"
                          d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Custom date range */}
          <CustomRangeEditor
            initialFrom={toInputValue(range.from)}
            initialTo={toInputValue(range.to)}
            onApply={applyCustom}
          />
        </div>
      )}
    </Dropdown>
  );
}

/**
 * Local-state editor for the custom range. Mounted fresh each time the
 * dropdown opens, so it seeds itself from the active range without an
 * effect.
 */
function CustomRangeEditor({
  initialFrom,
  initialTo,
  onApply,
}: {
  initialFrom: string;
  initialTo: string;
  onApply: (from: string, to: string) => void;
}) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  return (
    <div className="border-t border-line px-3 pb-2 pt-2.5">
      <p className="mb-2 text-xs font-medium text-faint">Custom date range</p>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          aria-label="Start date"
          className="min-w-0 flex-1 rounded-md border border-line bg-sunken px-2 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
        />
        <span className="text-ghost">–</span>
        <input
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          aria-label="End date"
          className="min-w-0 flex-1 rounded-md border border-line bg-sunken px-2 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
        />
      </div>
      <Button size="sm" variant="default" className="mt-2 w-full" onClick={() => onApply(from, to)}>
        Apply range
      </Button>
    </div>
  );
}
