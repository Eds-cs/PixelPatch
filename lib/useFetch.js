// lib/useFetch.js — GET helper with pull-to-refresh.
//
// State is only ever written from an async continuation, never synchronously in
// the effect body, and every in-flight request is cancellable so a slow reply
// for an old `path` cannot overwrite a newer one.
import { useCallback, useEffect, useRef, useState } from "react";
import api from "./api";

const INITIAL = { data: null, error: null, loading: true };

export function useFetch(path, select) {
  const [state, setState] = useState(INITIAL);
  const [refreshing, setRefreshing] = useState(false);

  // `select` is usually an inline arrow, so keeping it in a ref stops it from
  // re-triggering the effect on every render. Assigned in an effect, never
  // during render.
  const selectRef = useRef(select);
  useEffect(() => {
    selectRef.current = select;
  });

  // Guards against a resolved request writing state after unmount or after
  // `path` moved on.
  const requestId = useRef(0);

  const load = useCallback(async (targetPath, isRefresh) => {
    if (!targetPath) return;

    const id = requestId.current + 1;
    requestId.current = id;

    if (isRefresh) setRefreshing(true);

    try {
      const res = await api.get(targetPath);
      if (requestId.current !== id) return;
      const raw = res.data;
      setState({
        data: selectRef.current ? selectRef.current(raw) : raw,
        error: null,
        loading: false,
      });
    } catch (e) {
      if (requestId.current !== id) return;
      setState((prev) => ({ ...prev, error: e.message || "Something went wrong.", loading: false }));
    } finally {
      if (requestId.current === id) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // A null path means a dependency (e.g. shopId) has not resolved yet.
    if (!path) return undefined;

    load(path, false);

    // Invalidate this request if the path changes or the screen unmounts.
    return () => {
      requestId.current += 1;
    };
  }, [path, load]);

  const refresh = useCallback(() => load(path, true), [load, path]);

  return { ...state, refreshing, refresh };
}
