const storageKey = "metrispot-pinned-menu-items";

export function readPinnedItems(scope: string): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Record<string, unknown>;
    const items = saved[scope];
    return Array.isArray(items) ? items.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function writePinnedItems(scope: string, items: string[]) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Record<string, unknown>;
    localStorage.setItem(storageKey, JSON.stringify({ ...saved, [scope]: items }));
  } catch {
    return;
  }
}
