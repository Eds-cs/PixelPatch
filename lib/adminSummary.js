// lib/adminSummary.js
// GET /api/admin/summary for the admin navigation badges and the dashboard
// to-do list. Re-fetched whenever the admin moves to another page (the path
// is part of the URL), so counts drop as soon as items are handled.
import { usePathname } from "expo-router";

import { useFetch } from "./useFetch";

// Admin section -> the summary count shown as its badge (items waiting for an admin).
export const ADMIN_BADGES = {
  shops: "pending_shops",
  services: "pending_services",
  disputes: "disputes_need_admin",
  warranty: "warranty_claims_need_admin",
  repairs: "repairs_awaiting_shop",
};

/** { summary, loading, error, refresh }. Pass enabled = false for non-admins. */
export function useAdminSummary(enabled = true) {
  const pathname = usePathname();
  const { data, loading, error, refreshing, refresh } = useFetch(
    enabled ? `/admin/summary?view=${encodeURIComponent(pathname || "")}` : null,
    (d) => d.summary ?? {}
  );
  return { summary: data ?? {}, loading: enabled && loading, error, refreshing, refresh };
}

/** The badge count for an admin route like "/admin/shops", or 0. */
export function adminBadge(summary, href) {
  const key = ADMIN_BADGES[String(href).replace(/^\/admin\//, "")];
  return key ? Number(summary?.[key] || 0) : 0;
}

/** "3 days", "5 hours", "a few minutes": how long ago `since` was. */
export function waitingFor(since) {
  if (!since) return null;
  const date = new Date(String(since).replace(" ", "T"));
  const ms = Date.now() - date.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "under an hour";
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}
