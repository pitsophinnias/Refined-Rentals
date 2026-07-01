/**
 * ThemeProvider.jsx — theme + font size context
 */

import { createContext, useContext, useState, useEffect } from "react";
import { buildTokens, F } from "./tokens.js";

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("rr-admin-theme") !== "light"; }
    catch { return true; }
  });

  const [fontSize, setFontSize] = useState(() => {
    try { return Number(localStorage.getItem("rr-admin-fontsize") || 14); }
    catch { return 14; }
  });

  const toggle = () => setIsDark(d => {
    const next = !d;
    try { localStorage.setItem("rr-admin-theme", next ? "dark" : "light"); } catch {}
    return next;
  });

  const changeFontSize = (size) => {
    setFontSize(size);
    try { localStorage.setItem("rr-admin-fontsize", String(size)); } catch {}
  };

  const C = buildTokens(isDark, fontSize);

  useEffect(() => {
    document.body.style.background = C.bg;
    document.body.style.color      = C.textPrimary;
    document.body.style.fontSize   = `${fontSize}px`;
  }, [isDark, fontSize]);

  return (
    <ThemeCtx.Provider value={{ C, F, isDark, toggle, fontSize, changeFontSize }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}