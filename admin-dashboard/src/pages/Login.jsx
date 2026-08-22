/**
 * pages/Login.jsx
 * Admin login gate. Simple credential check against env vars.
 * Replace with Supabase Auth when backend is live.
 */

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../ThemeProvider.jsx";
import { auth as authApi, health as healthApi } from "../api.js";

export default function Login({ onLogin }) {
  const { C, F } = useTheme();

  const [email, setEmail]   = useState("");
  const [pass, setPass]     = useState("");
  const [error, setError]   = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [waking, setWaking] = useState(true);

  // Ping the backend as soon as the login page mounts — on Render's free
  // tier a sleeping backend takes 30-60s to wake, so start that clock
  // immediately instead of waiting for the user to submit the form.
  useEffect(() => {
    let cancelled = false;
    healthApi.ping()
      .catch(() => {}) // best-effort — the login request has its own error handling
      .finally(() => { if (!cancelled) setWaking(false); });
    return () => { cancelled = true; };
  }, []);

  const attemptLogin = useCallback(async () => {
    setError("");
    setCanRetry(false);
    setLoading(true);
    try {
      const data = await authApi.login(email, pass);
      onLogin(data.token, data.admin.email);
    } catch (err) {
      if (err.message === "Invalid credentials") {
        setError("Incorrect email or password.");
        setCanRetry(false);
      } else if (err.message === "TIMEOUT" || err.message === "NETWORK_ERROR") {
        setError("Server is starting up, please try again in a moment.");
        setCanRetry(true);
      } else {
        setError("Something went wrong. Please try again.");
        setCanRetry(true);
      }
    } finally {
      setLoading(false);
    }
  }, [email, pass, onLogin]);

  const handleSubmit = (e) => {
    e.preventDefault();
    attemptLogin();
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${C.border}`,
    borderRadius: 2, padding: "13px 14px",
    color: C.textPrimary,
    fontSize: "0.9rem", fontFamily: F.body, fontWeight: 300,
    outline: "none", transition: "border-color 0.25s",
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1.5rem",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background rings */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "60vw", height: "60vw", maxWidth: 700, maxHeight: 700, borderRadius: "50%", border: "1px solid rgba(33,150,196,0.06)" }}/>
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "40vw", height: "40vw", maxWidth: 480, maxHeight: 480, borderRadius: "50%", border: "1px solid rgba(33,150,196,0.05)" }}/>
      </div>

      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            border: `1.5px solid ${C.blue}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem",
          }}>
            <span style={{
              fontFamily: F.display, fontSize: 20, fontWeight: 600,
              color: C.blue, letterSpacing: "0.04em",
            }}>rr</span>
          </div>
          <h1 style={{
            fontFamily: F.display,
            fontSize: "1.9rem", fontWeight: 500,
            color: C.textPrimary, margin: "0 0 0.35rem",
            letterSpacing: "0.03em",
          }}>Refined Rentals</h1>
          <p style={{
            fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase",
            color: C.textDim, fontFamily: F.body, margin: 0,
          }}>Admin Dashboard</p>
        </div>

        {/* Card */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 3, padding: "2rem",
        }}>
          <h2 style={{
            fontFamily: F.display, fontSize: "1.3rem", fontWeight: 500,
            color: C.textPrimary, margin: waking ? "0 0 0.6rem" : "0 0 1.75rem",
          }}>Sign in to continue</h2>

          {waking && (
            <p style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: "0.78rem", color: C.textDim,
              fontFamily: F.body, fontWeight: 300,
              margin: "0 0 1.15rem",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: C.blue, flexShrink: 0,
                animation: "rr-pulse 1.2s ease-in-out infinite",
              }} />
              Connecting to server…
            </p>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{
                display: "block", fontSize: 9.5, letterSpacing: "0.2em",
                textTransform: "uppercase", color: C.textDim,
                fontFamily: F.body, marginBottom: 6,
              }}>Email Address</label>
              <input
                type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@refinedrentals.co.ls"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = C.blue}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            <div>
              <label style={{
                display: "block", fontSize: 9.5, letterSpacing: "0.2em",
                textTransform: "uppercase", color: C.textDim,
                fontFamily: F.body, marginBottom: 6,
              }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={pass} required
                  onChange={e => setPass(e.target.value)}
                  placeholder="••••••••••"
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={e => e.target.style.borderColor = C.blue}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: C.textDim, padding: 0, fontSize: 13,
                  }}
                >{showPass ? "🙈" : "👁"}</button>
              </div>
            </div>

            {error && (
              <div style={{
                background: "rgba(217,79,79,0.1)", border: "1px solid rgba(217,79,79,0.25)",
                borderRadius: 2, padding: "9px 12px",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <span style={{
                  color: "#d94f4f", fontSize: "0.82rem",
                  fontFamily: F.body, fontWeight: 300,
                }}>{error}</span>
                {canRetry && (
                  <button
                    type="button" onClick={attemptLogin} disabled={loading}
                    style={{
                      alignSelf: "flex-start",
                      background: "none", border: "1px solid rgba(217,79,79,0.4)",
                      borderRadius: 2, color: "#d94f4f",
                      cursor: loading ? "wait" : "pointer",
                      padding: "6px 14px", fontSize: 10,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      fontWeight: 600, fontFamily: F.body,
                    }}
                  >Try Again</button>
                )}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                marginTop: 4,
                background: loading ? "rgba(33,150,196,0.45)" : C.blue,
                border: "none", borderRadius: 2,
                color: C.white, cursor: loading ? "wait" : "pointer",
                padding: "14px", fontSize: 11,
                letterSpacing: "0.2em", textTransform: "uppercase",
                fontWeight: 600, fontFamily: F.body,
                transition: "background 0.25s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.blueLight; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = loading ? "rgba(33,150,196,0.45)" : C.blue; }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <style>{`@keyframes rr-pulse { 0%, 100% { opacity: 0.35 } 50% { opacity: 1 } }`}</style>
        </div>

        <p style={{
          textAlign: "center", marginTop: "1.5rem",
          color: C.textDim, fontSize: "0.78rem",
          fontFamily: F.body, fontWeight: 300,
        }}>
          Refined Rentals (PTY) LTD · Lesotho
        </p>
      </div>
    </div>
  );
}
