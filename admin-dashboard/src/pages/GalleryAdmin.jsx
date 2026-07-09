/**
 * pages/GalleryAdmin.jsx
 * Admin uploads images/videos to the API. Two independent sections:
 *  - "main"    → homepage film-reel slideshow
 *  - "contact" → the two-image grid in the Contact section
 * Customer site reads each section by filtering GET /api/gallery?category=...
 */

import { useState, useEffect } from "react";
import { useTheme } from "../ThemeProvider.jsx";
import { gallery as galleryApi } from "../api.js";

function byCategory(items, category) {
  return items
    .filter(it => (it.category || "main") === category)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
}

export default function GalleryAdmin() {
  const { C, F } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState({ main: false, contact: false });

  useEffect(() => {
    galleryApi.list()
      .then(data => setItems(data.gallery || []))
      .catch(err => console.error("Gallery load error:", err));
  }, []);

  const handleFiles = async (files, category) => {
    setLoading(prev => ({ ...prev, [category]: true }));
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("label", file.name.replace(/\.[^.]+$/, ""));
        formData.append("category", category);
        const data = await galleryApi.upload(formData);
        setItems(prev => [...prev, data.item]);
      } catch (err) {
        console.error("Upload error:", err);
        alert(`Failed to upload ${file.name}: ${err.message}`);
      }
    }
    setLoading(prev => ({ ...prev, [category]: false }));
  };

  const removeItem = async (id) => {
    try {
      await galleryApi.delete(id);
      setItems(prev => prev.filter(it => it.id !== id));
    } catch (err) {
      alert("Failed to delete item: " + err.message);
    }
  };

  const updateLabel = async (id, label) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, label } : it));
    try {
      await galleryApi.updateLabel(id, label);
    } catch (err) {
      console.error("Label update error:", err);
    }
  };

  const moveItem = async (category, index, direction) => {
    const subset = byCategory(items, category);
    const j = index + direction;
    if (j < 0 || j >= subset.length) return;

    const reordered = [...subset];
    [reordered[index], reordered[j]] = [reordered[j], reordered[index]];
    const order = reordered.map((it, idx) => ({ id: it.id, sort_order: idx }));

    setItems(prev => prev.map(it => {
      const found = order.find(o => o.id === it.id);
      return found ? { ...it, sort_order: found.sort_order } : it;
    }));

    try {
      await galleryApi.reorder(order);
    } catch (err) {
      console.error("Reorder error:", err);
    }
  };

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 1000 }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: C.blue, fontFamily: F.body, marginBottom: 6 }}>Media</div>
        <h1 style={{ fontFamily: F.display, fontSize: "2rem", fontWeight: 500, color: C.textPrimary, margin: 0 }}>Gallery Manager</h1>
        <p style={{ color: C.textSecondary, fontSize: C.fontSize, fontFamily: F.body, fontWeight: 300, margin: "0.35rem 0 0" }}>
          Upload images and videos for the site. Each section below feeds a different part of the customer site.
        </p>
      </div>

      <GallerySection
        C={C} F={F}
        category="main"
        title="Homepage Gallery"
        description="Appears in the scrolling film-reel slideshow on the homepage, in the order shown here."
        acceptHint="JPG, PNG, MP4, MOV supported"
        accept="image/*,video/*"
        items={byCategory(items, "main")}
        loading={loading.main}
        onFiles={files => handleFiles(files, "main")}
        onRemove={removeItem}
        onLabelChange={updateLabel}
        onMoveUp={i => moveItem("main", i, -1)}
        onMoveDown={i => moveItem("main", i, 1)}
      />

      <div style={{ height: "2.5rem" }} />

      <GallerySection
        C={C} F={F}
        category="contact"
        title="Contact Section Images"
        description="Appears in the image grid next to the contact form. Add as many as you like — the grid grows to fit."
        acceptHint="JPG, PNG supported"
        accept="image/*"
        items={byCategory(items, "contact")}
        loading={loading.contact}
        onFiles={files => handleFiles(files, "contact")}
        onRemove={removeItem}
        onLabelChange={updateLabel}
        onMoveUp={i => moveItem("contact", i, -1)}
        onMoveDown={i => moveItem("contact", i, 1)}
      />
    </div>
  );
}

function GallerySection({ C, F, category, title, description, acceptHint, accept, items, loading, onFiles, onRemove, onLabelChange, onMoveUp, onMoveDown }) {
  const inputId = `gallery-upload-${category}`;
  const iStyle = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: "8px 12px", color: C.textPrimary, fontSize: C.fontSize, fontFamily: F.body, outline: "none", transition: "border-color 0.2s", width: "100%", boxSizing: "border-box" };

  return (
    <div>
      <div style={{ marginBottom: "0.9rem" }}>
        <h2 style={{ fontFamily: F.display, fontSize: "1.3rem", fontWeight: 500, color: C.textPrimary, margin: 0 }}>{title}</h2>
        <p style={{ color: C.textSecondary, fontSize: C.fontSizeSm, fontFamily: F.body, fontWeight: 300, margin: "0.3rem 0 0" }}>{description}</p>
      </div>

      {/* Upload zone */}
      <label
        htmlFor={inputId}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
        style={{ display: "block", border: `2px dashed ${C.borderBlue}`, borderRadius: 3, padding: "2rem", textAlign: "center", cursor: "pointer", background: C.blueDim, marginBottom: "1.25rem", transition: "background 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(33,150,196,0.18)"}
        onMouseLeave={e => e.currentTarget.style.background = C.blueDim}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>
          <svg viewBox="0 0 48 48" fill="none" style={{ width: 38, height: 38, margin: "0 auto", display: "block" }}>
            <rect x="4" y="4" width="40" height="40" rx="4" stroke={C.blue} strokeWidth="2"/>
            <circle cx="16" cy="18" r="4" stroke={C.blue} strokeWidth="2"/>
            <path d="M4 32l10-8 8 6 8-10 14 12" stroke={C.blue} strokeWidth="2" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontFamily: F.body, fontWeight: 600, color: C.textPrimary, fontSize: C.fontSize, marginBottom: 4 }}>
          {loading ? "Uploading..." : "Click or drag to upload"}
        </div>
        <div style={{ fontFamily: F.body, fontSize: C.fontSizeSm, color: C.textSecondary, fontWeight: 300 }}>
          {acceptHint}
        </div>
        <input id={inputId} type="file" multiple accept={accept} style={{ display: "none" }} onChange={e => onFiles(e.target.files)} />
      </label>

      {/* Items list */}
      {items.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, padding: "2rem", textAlign: "center", color: C.textDim, fontFamily: F.body, fontSize: C.fontSizeSm }}>
          No media uploaded yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item, i) => (
            <div key={item.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: "0.9rem 1.25rem", display: "flex", alignItems: "center", gap: 14, transition: "background 0.2s" }}>
              {/* Thumbnail */}
              <div style={{ width: 72, height: 52, borderRadius: 2, overflow: "hidden", flexShrink: 0, background: C.bg }}>
                {item.type === "video" ? (
                  <video src={item.src || `http://localhost:3001${item.url}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                ) : (
                  <img src={item.src || `http://localhost:3001${item.url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>

              {/* Type badge */}
              <span style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: item.type === "video" ? "#e8a020" : C.blue, fontFamily: F.body, fontWeight: 600, flexShrink: 0 }}>
                {item.type}
              </span>

              {/* Label input */}
              <input value={item.label} onChange={e => onLabelChange(item.id, e.target.value)} style={{ ...iStyle, flex: 1 }}
                onFocus={e => e.target.style.borderColor = C.blue}
                onBlur={e => e.target.style.borderColor = C.border}
              />

              {/* Order controls */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {[["↑", () => onMoveUp(i), i === 0], ["↓", () => onMoveDown(i), i === items.length - 1]].map(([icon, fn, disabled]) => (
                  <button key={icon} onClick={fn} disabled={disabled} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 2, width: 28, height: 28, cursor: disabled ? "not-allowed" : "pointer", color: disabled ? C.textDim : C.textSecondary, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", opacity: disabled ? 0.4 : 1 }}>
                    {icon}
                  </button>
                ))}
              </div>

              {/* Delete */}
              <button onClick={() => onRemove(item.id)} style={{ background: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.2)", borderRadius: 2, width: 32, height: 32, cursor: "pointer", color: C.danger, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(217,79,79,0.18)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(217,79,79,0.08)"}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: "0.75rem", color: C.textDim, fontSize: C.fontSizeSm, fontFamily: F.body, fontWeight: 300 }}>
        {items.length} item{items.length !== 1 ? "s" : ""}. Changes apply to the customer site immediately.
      </p>
    </div>
  );
}