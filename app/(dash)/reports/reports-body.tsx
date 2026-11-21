"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompact, formatDuration, formatNumber, formatPercent } from "@/lib/analytics/format";
import { CONNECTED_ACCOUNTS } from "@/lib/analytics/mock-data";
import { DATE_PRESETS } from "@/lib/analytics/date-ranges";
import { PLATFORMS } from "@/lib/analytics/registry";
import type { PlatformId } from "@/lib/analytics/types";
import {
  INITIAL_WEBSITES,
} from "@/lib/analytics/website-data";
import {
  REPORT_TYPES,
  buildReport,
  reportToCsv,
  type GeneratedReport,
  type ReportKpi,
  type ReportTypeId,
} from "@/lib/analytics/reports-data";
import { cn } from "@/lib/utils";
import { ChartTooltip, SectionHeading } from "../analytics/shared";

/* ------------------------------------------------------------------ helpers */

function formatKpi(kpi: ReportKpi): string {
  switch (kpi.format) {
    case "percent":
      return formatPercent(kpi.value);
    case "duration":
      return formatDuration(kpi.value);
    case "number":
      return formatNumber(kpi.value);
    default:
      return formatCompact(kpi.value);
  }
}

/** Client-side CSV download built from the mock report. */
function downloadCsv(report: GeneratedReport) {
  const csv = reportToCsv(report);
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-${report.typeId}-${report.generatedAt.slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ select */

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-faint">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors hover:bg-sunken focus:border-brand focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ------------------------------------------------------------------ report document */

function ReportDocument({ report }: { report: GeneratedReport }) {
  return (
    <div className="space-y-6">
      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-faint">
        <Badge variant="neutral">Generated {report.generatedLabel}</Badge>
        <Badge variant="outline">{report.scope.period}</Badge>
        {report.scope.platform !== "All" && (
          <Badge variant="outline">{report.scope.platform}</Badge>
        )}
        {report.scope.account !== "All" && (
          <Badge variant="outline">{report.scope.account}</Badge>
        )}
        {report.scope.website !== "All" && (
          <Badge variant="outline">{report.scope.website}</Badge>
        )}
      </div>

      {/* Executive summary */}
      <section>
        <SectionHeading title="Executive summary" />
        <ul className="space-y-2">
          {report.summary.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-muted">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                aria-hidden="true"
              />
              {bullet}
            </li>
          ))}
        </ul>
      </section>

      {/* KPI row */}
      <section>
        <SectionHeading title="Key metrics" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {report.kpis.map((kpi) => (
            <div key={kpi.id} className="rounded-md border border-line bg-sunken px-3 py-2.5">
              <p className="text-[11px] text-faint">{kpi.label}</p>
              <p className="mt-1 truncate text-lg font-semibold text-ink">{formatKpi(kpi)}</p>
              <p
                className={cn(
                  "mt-0.5 text-[11px] font-medium",
                  kpi.changePct >= 0 ? "text-green-500" : "text-red-500",
                )}
              >
                {formatPercent(kpi.changePct, { signed: true })}
                <span className="ml-1 font-normal text-ghost">vs previous</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Trend chart */}
      <section>
        <SectionHeading title={report.chart.title} description="Daily trend for the selected period" />
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={report.chart.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="report-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff5c39" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#ff5c39" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--faint)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--line)" }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(value: number) => formatCompact(value)}
                tick={{ fontSize: 11, fill: "var(--faint)" }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<ChartTooltip format="compact" />} />
              <Area
                type="monotone"
                dataKey="value"
                name="Value"
                stroke="#ff5c39"
                strokeWidth={2}
                fill="url(#report-fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Main table */}
      <section>
        <SectionHeading title={report.table.title} />
        <div className="overflow-x-auto rounded-md border border-line">
          <Table>
            <TableHeader>
              <TableRow>
                {report.table.columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(column.align === "right" && "text-right")}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.table.rows.map((row, index) => (
                <TableRow key={index}>
                  {report.table.columns.map((column) => {
                    const raw = row[column.key];
                    const numeric = typeof raw === "number";
                    const display = numeric
                      ? column.key === "bounce" || column.key === "rate" || column.key === "share" || column.key === "newShare"
                        ? formatPercent(raw)
                        : column.key === "duration"
                          ? formatDuration(raw)
                          : column.key === "rank"
                            ? String(raw)
                            : formatNumber(raw)
                      : String(raw ?? "");
                    return (
                      <TableCell
                        key={column.key}
                        className={cn(
                          column.align === "right" && "text-right",
                          column.key === "rank" && "w-10 text-faint",
                          column.key === "path" && "font-mono text-xs",
                        )}
                      >
                        {display}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ page body */

type GenerateState = "idle" | "generating" | "ready";

/**
 * Reports body — report type cards, scope filters (date range, platform,
 * account, website), a simulated generate step, an inline preview plus a
 * focused preview modal, and CSV/PDF export actions. CSV is a real
 * client-side download; PDF export is simulated in this frontend-only
 * build and confirms with a toast-style status line.
 */
export function ReportsBody() {
  const [typeId, setTypeId] = useState<ReportTypeId>("overall");
  const [preset, setPreset] = useState("last30");
  const [platformId, setPlatformId] = useState<PlatformId | "all">("all");
  const [accountId, setAccountId] = useState<string>("all");
  const [websiteId, setWebsiteId] = useState<string>("all");

  const [state, setState] = useState<GenerateState>("idle");
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending generate timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const type = REPORT_TYPES.find((item) => item.id === typeId) ?? REPORT_TYPES[0];

  const platformOptions = useMemo(
    () => [
      { value: "all", label: "All platforms" },
      ...(Object.keys(PLATFORMS) as PlatformId[])
        .filter((id) => id !== "website")
        .map((id) => ({ value: id, label: PLATFORMS[id].label })),
    ],
    [],
  );

  const accountOptions = useMemo(() => {
    const accounts = CONNECTED_ACCOUNTS.filter(
      (account) => platformId === "all" || account.platformId === platformId,
    );
    return [
      { value: "all", label: "All accounts" },
      ...accounts.map((account) => ({ value: account.id, label: account.accountName })),
    ];
  }, [platformId]);

  const websiteOptions = useMemo(
    () => [
      { value: "all", label: "All websites" },
      ...INITIAL_WEBSITES.map((site) => ({ value: site.id, label: site.name })),
    ],
    [],
  );

  const periodLabel =
    DATE_PRESETS.find((item) => item.id === preset)?.label ?? "Last 30 days";

  const handleGenerate = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("generating");
    setStatus(null);
    // Simulated async generation against the mock report builder.
    timerRef.current = setTimeout(() => {
      const platformLabel =
        platformId === "all" ? "All" : PLATFORMS[platformId].label;
      const accountLabel =
        accountId === "all"
          ? "All"
          : (CONNECTED_ACCOUNTS.find((account) => account.id === accountId)?.accountName ??
            "All");
      const websiteLabel =
        websiteId === "all"
          ? "All"
          : (INITIAL_WEBSITES.find((site) => site.id === websiteId)?.name ?? "All");

      const generated = buildReport(
        typeId,
        {
          presetId: preset,
          periodLabel,
          platformId,
          platformLabel,
          accountId,
          accountLabel,
          websiteId,
          websiteLabel,
        },
        new Date(),
      );
      setReport(generated);
      setState("ready");
      setStatus(`Report generated — ${generated.title}`);
    }, 900);
  };

  const handleExportCsv = () => {
    if (!report) return;
    setExporting("csv");
    // Yield a frame so the button shows its busy state, then download.
    setTimeout(() => {
      try {
        downloadCsv(report);
        setStatus(`CSV downloaded — report-${report.typeId}-${report.generatedAt.slice(0, 10)}.csv`);
      } catch {
        setStatus("CSV export failed in this browser. Please try again.");
      } finally {
        setExporting(null);
      }
    }, 300);
  };

  const handleExportPdf = () => {
    if (!report) return;
    setExporting("pdf");
    // PDF rendering needs a backend or print engine; simulate the flow.
    setTimeout(() => {
      setExporting(null);
      setStatus(
        `PDF export simulated — “${report.title}” is ready (frontend-only build, no PDF engine bundled).`,
      );
    }, 1100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Reports</h1>
          <p className="mt-1 text-sm text-faint">
            Generate polished analytics reports from mock data — pick a type, set the
            scope, preview and export.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!report || state !== "ready"}
            onClick={() => setPreviewOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
              <circle cx="12" cy="12" r="2.75" />
            </svg>
            Preview report
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!report || state !== "ready" || exporting !== null}
            onClick={handleExportCsv}
          >
            {exporting === "csv" ? "Exporting…" : "Export CSV"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!report || state !== "ready" || exporting !== null}
            onClick={handleExportPdf}
          >
            {exporting === "pdf" ? "Preparing…" : "Export PDF"}
          </Button>
          <Button
            type="button"
            disabled={state === "generating"}
            onClick={handleGenerate}
          >
            {state === "generating"
              ? "Generating…"
              : state === "ready"
                ? "Regenerate"
                : "Generate report"}
          </Button>
        </div>
      </header>

      {/* Status line */}
      {status && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-line bg-sunken px-4 py-2.5 text-sm text-muted"
        >
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
            {status}
          </span>
          <button
            type="button"
            onClick={() => setStatus(null)}
            className="text-xs text-ghost transition-colors hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Report type picker */}
      <section>
        <SectionHeading
          title="Report type"
          description="Five ready-made report templates — each scopes its own filters"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {REPORT_TYPES.map((item) => {
            const active = item.id === typeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTypeId(item.id)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col gap-1.5 rounded-lg border p-4 text-left transition-colors",
                  active
                    ? "border-brand bg-brand/5"
                    : "border-line bg-surface hover:bg-sunken",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      active ? "text-brand" : "text-ink",
                    )}
                  >
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      active ? "border-brand bg-brand" : "border-line",
                    )}
                  >
                    {active && (
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.2}>
                        <path d="M2.5 6.2l2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="text-xs text-faint">{item.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-lg border border-line bg-surface p-4">
        <SectionHeading
          title="Report filters"
          description="Narrow the scope — filters apply when you generate"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="Date range"
            value={preset}
            onChange={setPreset}
            options={DATE_PRESETS.map((item) => ({ value: item.id, label: item.label }))}
          />
          {type.usesPlatform && (
            <FilterSelect
              label="Platform"
              value={platformId}
              onChange={(value) => {
                setPlatformId(value as PlatformId | "all");
                setAccountId("all");
              }}
              options={platformOptions}
            />
          )}
          {type.usesAccount && (
            <FilterSelect
              label="Connected account"
              value={accountId}
              onChange={setAccountId}
              options={accountOptions}
            />
          )}
          {type.usesWebsite && (
            <FilterSelect
              label="Website"
              value={websiteId}
              onChange={setWebsiteId}
              options={websiteOptions}
            />
          )}
        </div>
        <p className="mt-3 text-xs text-ghost">
          Scope: {periodLabel}
          {type.usesPlatform &&
            ` · ${platformId === "all" ? "All platforms" : PLATFORMS[platformId].label}`}
          {type.usesAccount &&
            ` · ${
              accountId === "all"
                ? "All accounts"
                : (CONNECTED_ACCOUNTS.find((account) => account.id === accountId)
                    ?.accountName ?? "All accounts")
            }`}
          {type.usesWebsite &&
            ` · ${
              websiteId === "all"
                ? "All websites"
                : (INITIAL_WEBSITES.find((site) => site.id === websiteId)?.name ??
                  "All websites")
            }`}
        </p>
      </section>

      {/* Preview area */}
      {state === "idle" && (
        <div className="rounded-lg border border-line bg-surface">
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sunken text-ghost">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
              </svg>
            </span>
            <p className="text-sm font-medium text-ink">No report generated yet</p>
            <p className="mt-1 max-w-sm text-xs text-faint">
              Choose a report type, set the filters above, then click Generate report to
              build it from mock data.
            </p>
            <Button type="button" className="mt-4" onClick={handleGenerate}>
              Generate report
            </Button>
          </div>
        </div>
      )}

      {state === "generating" && (
        <div className="space-y-4 rounded-lg border border-line bg-surface p-5">
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden="true" />
            Gathering data and composing the {type.label.toLowerCase()}…
          </div>
          <div className="h-8 animate-pulse rounded-md bg-sunken" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-md bg-sunken" />
            ))}
          </div>
          <div className="h-[200px] animate-pulse rounded-md bg-sunken" />
        </div>
      )}

      {state === "ready" && report && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">{report.title}</h2>
              <p className="mt-0.5 text-xs text-faint">
                Generated {report.generatedLabel} · mock data
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
              Open full preview →
            </Button>
          </div>
          <div className="rounded-lg border border-line bg-surface p-5">
            <ReportDocument report={report} />
          </div>
        </div>
      )}

      {/* Focused preview modal */}
      <Modal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={report?.title ?? "Report preview"}
        description={report ? `Generated ${report.generatedLabel}` : undefined}
        className="max-w-3xl"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!report || exporting !== null}
              onClick={handleExportCsv}
            >
              {exporting === "csv" ? "Exporting…" : "Export CSV"}
            </Button>
            <Button
              type="button"
              disabled={!report || exporting !== null}
              onClick={handleExportPdf}
            >
              {exporting === "pdf" ? "Preparing…" : "Export PDF"}
            </Button>
          </>
        }
      >
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          {report && <ReportDocument report={report} />}
        </div>
      </Modal>
    </div>
  );
}
