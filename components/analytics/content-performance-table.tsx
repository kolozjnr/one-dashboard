"use client";

import { useMemo, useState } from "react";
import { useAnalytics } from "./analytics-context";
import { EmptyState, SectionCard, TableSkeleton } from "./states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration, formatFullDate, formatNumber, formatPercent } from "@/lib/analytics/format";
import { buildContentRows } from "@/lib/analytics/mock-data";
import { PLATFORMS } from "@/lib/analytics/registry";
import type { ContentColumn, PlatformId } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

type SortState = { key: string; dir: "asc" | "desc" };

/**
 * Dynamic content performance table. Columns come straight from the
 * registry for the platforms in view, so a network never shows columns it
 * does not report. Search, sort, pagination, platform / type / date
 * filtering and empty + loading states are all handled here.
 */
export function ContentPerformanceTable() {
  const { selectedAccounts, range, loading } = useAnalytics();
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<PlatformId | "all">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState<SortState>({ key: "publishedAt", dir: "desc" });
  // Page is keyed to the active filters: changing any filter starts over at
  // page 1 without needing a reset effect.
  const [pageState, setPageState] = useState<{ key: string; page: number }>({
    key: "",
    page: 1,
  });

  const selectedPlatformIds = useMemo(
    () => [...new Set(selectedAccounts.map((account) => account.platformId))],
    [selectedAccounts],
  );
  const selectionKey = selectedPlatformIds.join(",");

  // The selection may drop a platform the filters point at — derive valid
  // filter values instead of trusting stale state.
  const activePlatform: PlatformId | "all" =
    platformFilter === "all" || selectedPlatformIds.includes(platformFilter)
      ? platformFilter
      : "all";

  const columns: ContentColumn[] = useMemo(() => {
    const platforms = activePlatform === "all" ? selectedPlatformIds : [activePlatform];
    const merged = new Map<string, ContentColumn>();
    platforms.forEach((platformId) =>
      PLATFORMS[platformId].content.forEach((column) => {
        if (!merged.has(column.key)) merged.set(column.key, column);
      }),
    );
    return [...merged.values()];
  }, [activePlatform, selectedPlatformIds]);

  const contentTypes = useMemo(() => {
    const platforms = activePlatform === "all" ? selectedPlatformIds : [activePlatform];
    return [...new Set(platforms.flatMap((platformId) => PLATFORMS[platformId].contentTypes))];
  }, [activePlatform, selectedPlatformIds]);

  const activeType = contentTypes.includes(typeFilter) ? typeFilter : "all";

  const rangeKey = `${range.from.getTime()}|${range.to.getTime()}`;
  const filterKey = `${selectionKey}|${query}|${activePlatform}|${activeType}|${rangeKey}`;
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });

  const rows = useMemo(() => {
    const platforms = activePlatform === "all" ? selectedPlatformIds : [activePlatform];
    return platforms.flatMap((platformId) => buildContentRows(platformId, range));
  }, [activePlatform, selectedPlatformIds, range]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (activeType !== "all" && row.type !== activeType) return false;
      return !normalized || row.title.toLowerCase().includes(normalized);
    });
  }, [rows, query, activeType]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const { key, dir } = sort;
    list.sort((a, b) => {
      let comparison = 0;
      if (key === "publishedAt") {
        comparison = Date.parse(a.publishedAt) - Date.parse(b.publishedAt);
      } else if (key === "text") {
        comparison = a.title.localeCompare(b.title);
      } else {
        const left = a.metrics[key] ?? Number.NEGATIVE_INFINITY;
        const right = b.metrics[key] ?? Number.NEGATIVE_INFINITY;
        comparison = left - right;
      }
      return dir === "asc" ? comparison : -comparison;
    });
    return list;
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, sorted.length);

  const toggleSort = (key: string) => {
    setPage(1);
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "publishedAt" || key === "text" ? "asc" : "desc" },
    );
  };

  return (
    <SectionCard
      title="Content performance"
      description="Posts from the selected sources in the active date range"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ghost"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search content"
              className="w-40 rounded-md border border-line bg-surface py-1.5 pl-8 pr-2 text-sm text-ink placeholder:text-ghost focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 sm:w-48"
            />
          </div>

          {/* Platform filter */}
          <select
            value={activePlatform}
            onChange={(event) => {
              setPlatformFilter(event.target.value as PlatformId | "all");
              setPage(1);
            }}
            aria-label="Filter by platform"
            className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-muted focus:border-brand focus:outline-none"
          >
            <option value="all">All platforms</option>
            {selectedPlatformIds.map((platformId) => (
              <option key={platformId} value={platformId}>
                {PLATFORMS[platformId].label}
              </option>
            ))}
          </select>

          {/* Content type filter */}
          {contentTypes.length > 0 && (
            <select
              value={activeType}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by content type"
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-muted focus:border-brand focus:outline-none"
            >
              <option value="all">All types</option>
              {contentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          )}
        </div>
      }
    >
      {loading ? (
        <TableSkeleton rows={6} columns={Math.min(Math.max(columns.length, 4), 7)} />
      ) : columns.length === 0 || sorted.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "No content for these sources" : "No matching content"}
          description={
            rows.length === 0
              ? "The selected sources do not publish trackable content. Pick a social account to see its posts."
              : "Try a different search term or clear the content type filter."
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(column.align === "right" && "text-right")}
                  >
                    <SortButton
                      label={column.label}
                      active={sort.key === column.key || (column.type === "text" && sort.key === "text")}
                      dir={sort.key === column.key || (column.type === "text" && sort.key === "text") ? sort.dir : null}
                      onClick={() => toggleSort(column.type === "text" ? "text" : column.key)}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        column.align === "right" && "text-right tabular-nums",
                        column.type === "text" && "max-w-[22rem]",
                      )}
                    >
                      <Cell column={column} row={row} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Footer: count + pagination */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-faint">
              Showing {rangeStart}–{rangeEnd} of {sorted.length} posts
            </p>
            <nav className="flex items-center gap-1.5" aria-label="Content pages">
              <PageButton
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
                ariaLabel="Previous page"
              >
                <path d="M15 19l-7-7 7-7" />
              </PageButton>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  aria-current={number === currentPage ? "page" : undefined}
                  className={cn(
                    "h-8 min-w-8 rounded-md border px-2 text-sm transition-colors",
                    number === currentPage
                      ? "border-brand font-semibold text-brand"
                      : "border-line text-muted hover:bg-sunken",
                  )}
                >
                  {number}
                </button>
              ))}
              <PageButton
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === pageCount}
                ariaLabel="Next page"
              >
                <path d="M9 5l7 7-7 7" />
              </PageButton>
            </nav>
          </div>
        </>
      )}
    </SectionCard>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc" | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-ink",
        active && "text-ink",
      )}
    >
      {label}
      <svg
        viewBox="0 0 12 12"
        fill="currentColor"
        className={cn("h-2.5 w-2.5 transition-opacity", dir ? "opacity-100" : "opacity-30")}
      >
        {dir === "asc" ? <path d="M6 3l3.5 4h-7z" /> : <path d="M6 9L2.5 5h7z" />}
      </svg>
    </button>
  );
}

function PageButton({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted transition-colors hover:bg-sunken disabled:opacity-40 disabled:pointer-events-none"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        {children}
      </svg>
    </button>
  );
}

function Cell({ column, row }: { column: ContentColumn; row: ReturnType<typeof buildContentRows>[number] }) {
  const platform = PLATFORMS[row.platformId];

  switch (column.type) {
    case "thumb":
      return (
        <span
          className="flex h-10 w-10 items-center justify-center rounded-md text-white shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${platform.color}, ${platform.color}99)`,
          }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M9 7.5v9l7-4.5z" />
          </svg>
        </span>
      );
    case "text":
      return (
        <span className="line-clamp-2 block leading-snug" title={row.title}>
          {row.title}
        </span>
      );
    case "date":
      return <span className="whitespace-nowrap text-faint">{formatFullDate(new Date(row.publishedAt))}</span>;
    case "rate":
      return <span>{formatPercent(row.metrics[column.key] ?? 0)}</span>;
    case "duration":
      return <span>{formatDuration(row.metrics[column.key] ?? 0)}</span>;
    case "number":
    default: {
      const value = row.metrics[column.key];
      return <span>{value === undefined ? "—" : formatNumber(value)}</span>;
    }
  }
}
