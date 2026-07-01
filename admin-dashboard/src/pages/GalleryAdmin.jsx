/**
 * pages/GalleryAdmin.jsx
 * Admin uploads images/videos; stored in localStorage; customer site reads from same key.
 */

import { useState, useRef, useEffect } from "react";
import { useTheme } from "../ThemeProvider.jsx";

export default function GalleryAdmin() {
  const { C, F } = useTheme();
  const fileRef = useRef(null);
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(null); // index being dragged
  const [loading, setLoading] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("rr_gallery") || "null");
      if (stored) setItems(stored);
    } catch {}
  }, []);

  const save = (newItems) => {
    setItems(newItems);
    try { localStorage.setItem("rr_gallery", JSON.stringify(newItems)); } catch {}
  };

  const handleFiles = async (files) => {
    setLoading(true);
    const newItems = [...items];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const src = await new Promise(res => {
        const reader = new FileReader();
        reader.onload = e => res(e.target.result);
        reader.readAsDataURL(file);
      });
      newItems.push({ src, type: isVideo ? "video" : "image", label: file.name.replace(/\.[^.]+$/, ""), uploadedAt: new Date().toISOString() });
    }
    save(newItems);
    setLoading(false);
  };

  const removeItem = (i) => {
    const next = items.filter((_, idx) => idx !== i);
    save(next);
  };

  const updateLabel = (i, label) => {
    const next = items.map((it, idx) => idx === i ? { ...it, label } : it);
    save(next);
  };

  const moveUp = (i) => {
    if (i === 0) return;
    const next = [...items];
    [next[i-1], next[i]] = [next[i], next[i-1]];
    save(next);
  };

  const moveDown = (i) => {
    if (i === items.length - 1) return;
    const next = [...items];
    [next[i], next[i+1]] = [next[i+1], next[i]];
    save(next);
  };

  const iStyle = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: "8px 12px", color: C.textPrimary, fontSize: C.fontSize, fontFamily: F.body, outline: "none", transition: "border-color 0.2s", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1000 }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: C.blue, fontFamily: F.body, marginBottom: 6 }}>Media</div>
        <h1 style={{ fontFamily: F.display, fontSize: "2rem", fontWeight: 500, color: C.textPrimary, margin: 0 }}>Gallery Manager</h1>
        <p style={{ color: C.textSecondary, fontSize: C.fontSize, fontFamily: F.body, fontWeight: 300, margin: "0.35rem 0 0" }}>
          Upload images and videos. They appear on the customer site slideshow in the order shown here.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); }}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        style={{ border: `2px dashed ${C.borderBlue}`, borderRadius: 3, padding: "2.5rem", textAlign: "center", cursor: "pointer", background: C.blueDim, marginBottom: "1.5rem", transition: "background 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(33,150,196,0.18)"}
        onMouseLeave={e => e.currentTarget.style.background = C.blueDim}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>
          <svg viewBox="0 0 48 48" fill="none" style={{ width: 48, height: 48, margin: "0 auto", display: "block" }}>
            <rect x="4" y="4" width="40" height="40" rx="4" stroke={C.blue} strokeWidth="2"/>
            <circle cx="16" cy="18" r="4" stroke={C.blue} strokeWidth="2"/>
            <path d="M4 32l10-8 8 6 8-10 14 12" stroke={C.blue} strokeWidth="2" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontFamily: F.body, fontWeight: 600, color: C.textPrimary, fontSize: C.fontSizeLg, marginBottom: 4 }}>
          {loading ? "Uploading..." : "Click or drag to upload"}
        </div>
        <div style={{ fontFamily: F.body, fontSize: C.fontSize, color: C.textSecondary, fontWeight: 300 }}>
          JPG, PNG, MP4, MOV supported
        </div>
        <input ref={fileRef} type="file" multiple accept="image/*,video/*" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, padding: "3rem", textAlign: "center", color: C.textDim, fontFamily: F.body, fontSize: C.fontSize }}>
          No media uploaded yet. Add images or videos above to populate the customer site gallery.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: "0.9rem 1.25rem", display: "flex", alignItems: "center", gap: 14, transition: "background 0.2s" }}>
              {/* Thumbnail */}
              <div style={{ width: 72, height: 52, borderRadius: 2, overflow: "hidden", flexShrink: 0, background: C.bg }}>
                {item.type === "video" ? (
                  <video src={item.src} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                ) : (
                  <img src={item.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>

              {/* Type badge */}
              <span style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: item.type === "video" ? "#e8a020" : C.blue, fontFamily: F.body, fontWeight: 600, flexShrink: 0 }}>
                {item.type}
              </span>

              {/* Label input */}
              <input value={item.label} onChange={e => updateLabel(i, e.target.value)} style={{ ...iStyle, flex: 1 }}
                onFocus={e => e.target.style.borderColor = C.blue}
                onBlur={e => e.target.style.borderColor = C.border}
              />

              {/* Order controls */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {[["↑", () => moveUp(i), i === 0], ["↓", () => moveDown(i), i === items.length - 1]].map(([icon, fn, disabled]) => (
                  <button key={icon} onClick={fn} disabled={disabled} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 2, width: 28, height: 28, cursor: disabled ? "not-allowed" : "pointer", color: disabled ? C.textDim : C.textSecondary, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", opacity: disabled ? 0.4 : 1 }}>
                    {icon}
                  </button>
                ))}
              </div>

              {/* Delete */}
              <button onClick={() => removeItem(i)} style={{ background: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.2)", borderRadius: 2, width: 32, height: 32, cursor: "pointer", color: C.danger, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(217,79,79,0.18)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(217,79,79,0.08)"}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: "1rem", color: C.textDim, fontSize: C.fontSizeSm, fontFamily: F.body, fontWeight: 300 }}>
        {items.length} item{items.length !== 1 ? "s" : ""} in gallery. Changes apply to the customer site immediately.
      </p>
    </div>
  );
}