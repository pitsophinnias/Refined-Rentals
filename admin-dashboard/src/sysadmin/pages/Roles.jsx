/**
 * sysadmin/pages/Roles.jsx — what each role can do, and who has it.
 * Read-only: roles are defined in code (backend/lib/roles.js and
 * admin-dashboard/src/usePermissions.js), and assigned on the Users page.
 */

import { useEffect, useState } from "react";
import { useTheme } from "../../ThemeProvider.jsx";
import { users as usersApi } from "../../api.js";
import { ROLE_PERMISSIONS_MAP, ROLE_LABELS, ROLE_DESCRIPTIONS, SYSADMIN_ASSIGNABLE_ROLES } from "../../usePermissions.js";
import { PERMISSION_LABELS, ROLE_COLORS } from "../constants.js";
import { PageHeader, Panel, RoleBadge } from "../ui.jsx";

export default function Roles() {
  const { C, F } = useTheme();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    usersApi.list()
      .then(d => setCounts((d.users || []).reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] || 0) + 1 }), {})))
      .catch(() => {});
  }, []);

  return (
    <div className="rr-page" style={{ padding: "2rem 2.5rem", maxWidth: 1100 }}>
      <PageHeader title="Roles" subtitle="What each role can do. Assign roles on the Users page." />
      {SYSADMIN_ASSIGNABLE_ROLES.map(role => {
        const col = ROLE_COLORS[role];
        const n = counts[role] || 0;
        return (
          <Panel key={role}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
              <RoleBadge role={role} />
              <span style={{ fontFamily: F.display, fontSize: "1.25rem", fontWeight: 500, color: C.textPrimary }}>{ROLE_LABELS[role]}</span>
              <span style={{ marginLeft: "auto", fontFamily: F.body, fontSize: C.fontSizeSm, color: C.textDim }}>{n} {n === 1 ? "user" : "users"}</span>
            </div>
            <p style={{ fontFamily: F.body, fontSize: C.fontSizeSm, color: C.textSecondary, fontWeight: 300, margin: "0 0 12px" }}>{ROLE_DESCRIPTIONS[role]}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {ROLE_PERMISSIONS_MAP[role].map(p => (
                <span key={p} style={{ background: col.bg, color: col.color, borderRadius: 3, padding: "4px 10px", fontSize: C.fontSizeSm - 1, fontFamily: F.body, fontWeight: 500 }}>{PERMISSION_LABELS[p] || p}</span>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
