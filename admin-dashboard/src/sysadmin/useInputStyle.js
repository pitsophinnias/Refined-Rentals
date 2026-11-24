/** sysadmin/useInputStyle.js — shared text input style for System Admin forms. */

import { useTheme } from "../ThemeProvider.jsx";

export function useInputStyle() {
  const { C, F } = useTheme();
  return { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 2, padding: "8px 11px", color: C.textPrimary, fontFamily: F.body, fontSize: C.fontSize, outline: "none", width: "100%", boxSizing: "border-box" };
}
