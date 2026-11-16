// lib/usePagedFetch.js — paged GET for long lists (`limit` / `offset`).
//
// The endpoint must answer { [listKey]: [...], total, ...extra }.
// - Changing `params` loads page one for the new query.
// - Bumping `version` reloads the current query but keeps showing the old
//   rows meanwhile (no flash back to a spinner after an action).
// - `loadMore()` appends the next page.
// State is only written from async continuations, never synchronously inside
// an effect, and stale replies are dropped.
import { useCallback, useEffect, useRef, useState } from "react";
import api from "./api";

export function usePagedFetch(path, params, { listKey, pageSize = 50, version = 0 }) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== "")
  ).toString();
  const baseKey = `${path}?${query}`;
  const fullKey = `${baseKey}#${version}`;

  const [state, setState] = useState({ fullKey: null, baseKey: null, items: [], total: 0, extra: {}, error: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  const fetchPage = useCallback(async (key, base, offset) => {
    const id = ++requestId.current;
    try {
      const separator = base.includes("?") && !base.endsWith("?") ? "&" : "";
      const { data } = await api.get(`${base}${separator}limit=${pageSize}&offset=${offset}`);
      if (id !== requestId.current) return;
      const { [listKey]: rows, total, ...extra } = data ?? {};
      setState((previous) => ({
        fullKey: key,
        baseKey: base,
        items: offset === 0 ? rows ?? [] : [...previous.items, ...(rows ?? [])],
        total: Number(total) || 0,
        extra,
        error: null,
      }));
    } catch (error) {
      if (id !== requestId.current) return;
      setState((previous) => ({ ...previous, fullKey: key, baseKey: base, error: error.message || "Something went wrong." }));
    } finally {
      if (id === requestId.current) setLoadingMore(false);
    }
  }, [listKey, pageSize]);

  useEffect(() => {
    fetchPage(fullKey, baseKey, 0);
  }, [fullKey, baseKey, fetchPage]);

  const sameQuery = state.baseKey === baseKey;
  const items = sameQuery ? state.items : [];
  const total = sameQuery ? state.total : 0;

  const loadMore = useCallback(() => {
    if (loadingMore || state.fullKey !== fullKey || state.items.length >= state.total) return;
    setLoadingMore(true);
    fetchPage(fullKey, baseKey, state.items.length);
  }, [loadingMore, state, fullKey, baseKey, fetchPage]);

  return {
    items,
    total,
    extra: sameQuery ? state.extra : {},
    error: state.fullKey === fullKey ? state.error : null,
    // First load of this query (nothing to show yet).
    loading: !sameQuery,
    // Reloading the same query after `version` changed.
    refreshing: sameQuery && state.fullKey !== fullKey,
    loadingMore,
    hasMore: sameQuery && state.items.length < state.total,
    loadMore,
  };
}

/** Returns `value` after it has stopped changing for `delay` ms. */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
