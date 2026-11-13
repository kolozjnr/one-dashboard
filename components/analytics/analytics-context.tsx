"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getPresetRange } from "@/lib/analytics/date-ranges";
import { CONNECTED_ACCOUNTS, DEFAULT_SELECTED_IDS } from "@/lib/analytics/mock-data";
import type { ConnectedAccount, DatePresetId, DateRange } from "@/lib/analytics/types";

interface AnalyticsContextValue {
  /** Every connected app (statuses can change via retryAccount). */
  accounts: ConnectedAccount[];
  selectedIds: string[];
  /** Accounts currently filtering the dashboard. */
  selectedAccounts: ConnectedAccount[];
  toggleAccount: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  range: DateRange;
  setPreset: (preset: DatePresetId) => void;
  setCustomRange: (from: Date, to: Date) => void;
  /** True while mock data is "refetching" after a filter change. */
  loading: boolean;
  /** First selected account whose synchronisation failed, if any. */
  errorAccount: ConnectedAccount | null;
  retryAccount: (id: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

/** Simulated latency between a filter change and fresh mock data. */
const FETCH_MS = 450;
const RETRY_MS = 1400;

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(CONNECTED_ACCOUNTS);
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SELECTED_IDS);
  const [range, setRange] = useState<DateRange>(() => getPresetRange("last30"));
  // Key of the data currently on screen; `loading` is derived from the gap
  // between the active filters and the last completed "fetch".
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const selectionKey = useMemo(() => selectedIds.join(","), [selectedIds]);
  const rangeKey = `${range.from.getTime()}|${range.to.getTime()}`;
  const requestKey = `${selectionKey}|${rangeKey}`;
  const loading = loadedKey !== requestKey;

  // Shared simulated "fetch" for every filter change — drives skeletons.
  useEffect(() => {
    const timer = setTimeout(() => setLoadedKey(requestKey), FETCH_MS);
    return () => clearTimeout(timer);
  }, [requestKey]);

  const toggleAccount = useCallback((id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(accounts.map((account) => account.id));
  }, [accounts]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const setPreset = useCallback((preset: DatePresetId) => {
    setRange(getPresetRange(preset));
  }, []);

  const setCustomRange = useCallback((from: Date, to: Date) => {
    const safeFrom = from <= to ? from : to;
    const safeTo = from <= to ? to : from;
    setRange({ preset: "custom", from: safeFrom, to: safeTo });
  }, []);

  const retryAccount = useCallback((id: string) => {
    setAccounts((current) =>
      current.map((account) =>
        account.id === id ? { ...account, status: "syncing" } : account,
      ),
    );
    setTimeout(() => {
      setAccounts((current) =>
        current.map((account) =>
          account.id === id
            ? { ...account, status: "connected", lastSyncAt: new Date().toISOString() }
            : account,
        ),
      );
    }, RETRY_MS);
  }, []);

  const selectedAccounts = useMemo(
    () => accounts.filter((account) => selectedIds.includes(account.id)),
    [accounts, selectedIds],
  );

  const errorAccount = useMemo(
    () => selectedAccounts.find((account) => account.status === "error") ?? null,
    [selectedAccounts],
  );

  const value: AnalyticsContextValue = {
    accounts,
    selectedIds,
    selectedAccounts,
    toggleAccount,
    selectAll,
    clearSelection,
    range,
    setPreset,
    setCustomRange,
    loading,
    errorAccount,
    retryAccount,
  };

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used inside <AnalyticsProvider>");
  }
  return context;
}
