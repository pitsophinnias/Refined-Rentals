/**
 * usePermissions.js
 * React hook that returns what the current user can do based on their role.
 * Import and call inside any component that needs to show/hide UI based on role.
 *
 * Usage:
 *   const { can, role, loading } = usePermissions();
 *   if (can("quote")) { ... show quote builder ... }
 */

import { useState, useEffect } from "react";
import { auth as authApi } from "./api.js";

/* ── Permission map — mirrors the backend ────────────────────── */
const ROLE_PERMISSIONS = {
  ADMIN:   ["view","review","quote","close","notes","gallery","announcements","users","activity","notifications"],
  MANAGER: ["view","review","quote","close","notes","gallery","announcements","activity","notifications"],
  FINANCE: ["view","quote","close","notes","activity","notifications"],
  STAFF:   ["view","review","notes"],
  VIEWER:  ["view"],
};

export const ROLE_LABELS = {
  ADMIN:   "Admin",
  MANAGER: "Manager",
  FINANCE: "Finance",
  STAFF:   "Staff",
  VIEWER:  "Viewer",
};

export const ROLE_DESCRIPTIONS = {
  ADMIN:   "Full access — including user management and system settings",
  MANAGER: "Full operational access — quotes, gallery, announcements, activity log",
  FINANCE: "Quote and pricing focused — can build, send, revise and close quotes",
  STAFF:   "Frontline — can view requests, set In Review, and add internal notes",
  VIEWER:  "Read only — cannot make any changes",
};

export const ALL_ROLES = ["ADMIN", "MANAGER", "FINANCE", "STAFF", "VIEWER"];

let _cachedRole  = null;
let _cacheStamp  = 0;
const CACHE_TTL  = 60 * 1000; // re-fetch role every 60 seconds

export function usePermissions() {
  const [role,    setRole]    = useState(_cachedRole || "VIEWER");
  const [loading, setLoading] = useState(!_cachedRole);

  useEffect(() => {
    const now = Date.now();
    if (_cachedRole && now - _cacheStamp < CACHE_TTL) {
      setRole(_cachedRole);
      setLoading(false);
      return;
    }
    authApi.me()
      .then(data => {
        const r = data.admin.role || "ADMIN";
        _cachedRole = r;
        _cacheStamp = Date.now();
        setRole(r);
        setLoading(false);
      })
      .catch(() => {
        setRole("VIEWER"); // safe default on failure
        setLoading(false);
      });
  }, []);

  const can = (permission) => {
    return (ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.VIEWER).includes(permission);
  };

  return { can, role, loading, roleLabel: ROLE_LABELS[role] || role };
}