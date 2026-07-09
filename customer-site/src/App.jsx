/**
 * Refined Rentals (PTY) LTD — Customer Website
 * Updated with: logo, gallery slideshow, tent sizes, event duration, delivery info
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "./api.js";

/* ─── Design tokens ──────────────────────────────────────────── */
const C = {
  navy:      "#03112e",
  navyMid:   "#071e4a",
  navyLight: "#0c2d6b",
  blue:      "#2196c4",
  blueLight: "#4db8e0",
  white:     "#ffffff",
  offWhite:  "#f5f6f9",
  slate:     "#8a97b0",
  slateLight:"#c2cad8",
};

/* ─── Logo (base64) ──────────────────────────────────────────── */
const LOGO_B64 = "data:image/jpeg;base64,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";


/* ─── Tent sizes ─────────────────────────────────────────────── */
const TENT_SIZES = [
  {
    id: "9x9",
    size: "9 x 9m",
    configs: [
      { id: "cinema", label: "Cinema / Chairs Only", capacity: "~120 guests" },
      { id: "tables", label: "With Round Tables",    capacity: "5 round tables" },
    ],
  },
  {
    id: "9x12",
    size: "9 x 12m",
    configs: [
      { id: "cinema", label: "Cinema / Chairs Only", capacity: "~200 guests" },
      { id: "tables", label: "With Round Tables",    capacity: "10 round tables" },
    ],
  },
  {
    id: "9x15",
    size: "9 x 15m",
    configs: [
      { id: "cinema", label: "Cinema / Chairs Only", capacity: "~250 guests" },
      { id: "tables", label: "With Round Tables",    capacity: "15 round tables" },
    ],
  },
];

const NAV_LINKS = ["Services", "About", "Gallery", "Contact"];

const SERVICES = [
  {
    id: "Frame Tents",
    tag: "Most Requested",
    subtitle: "Frame Tents",
    title: "Space, Without Compromise",
    description: "Our heavy-duty frame tents are built without centre poles, so your layout stays exactly as you imagined. Available in three sizes with cinema or table configurations.",
    icon: (
      <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 38, height: 38 }}>
        <path d="M4 40 L28 10 L52 40" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M9 40 L9 50 L47 50 L47 40" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M20 50 L20 40 L36 40 L36 50" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "VIP Mobile Toilets",
    tag: "Premium Facility",
    subtitle: "VIP Mobile Toilets",
    title: "Comfort is Part of the Experience",
    description: "Fully flushable, spotlessly maintained, and fitted with modern amenities. Our mobile VIP units handle a detail most planners overlook — and your guests will notice the difference.",
    icon: (
      <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 38, height: 38 }}>
        <rect x="13" y="7" width="30" height="42" rx="3" stroke="currentColor" strokeWidth="2"/>
        <path d="M13 18 L43 18" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="28" cy="32" r="5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M22 46 L34 46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "Red Carpet",
    tag: "Signature Touch",
    subtitle: "Red Carpet",
    title: "First Impressions, Done Right",
    description: "A well-placed red carpet sets the tone before anyone says a word. We supply high-quality, vibrant carpets for entrances and photo moments.",
    icon: (
      <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 38, height: 38 }}>
        <path d="M7 46 L7 14 Q7 11 10 11 L46 11 Q49 11 49 14 L49 46" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M7 46 L49 46" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M18 11 L18 46" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" opacity="0.5"/>
        <path d="M28 11 L28 46" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" opacity="0.5"/>
        <path d="M38 11 L38 46" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: "Green Grass Carpet",
    tag: "Finishing Detail",
    subtitle: "Green Grass Carpet",
    title: "Ground the Space, Lift the Mood",
    description: "Lush synthetic grass carpeting for outdoor events, garden setups, or any space that benefits from something underfoot.",
    icon: (
      <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 38, height: 38 }}>
        <path d="M7 38 Q14 18 21 25 Q25 10 28 25 Q31 14 35 25 Q42 18 49 38" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
        <path d="M4 46 L52 46" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const WHY_US = [
  { num: "01", label: "Quality You Can See",     desc: "Our equipment is well-maintained, regularly serviced, and sourced for events that actually matter." },
  { num: "02", label: "Built Around Your Event", desc: "No two events are the same. We listen first, then put together exactly what you need." },
  { num: "03", label: "We Handle the Setup",     desc: "Delivery, installation, and collection — all managed by our team so you can focus elsewhere." },
  { num: "04", label: "Reliable From Start to Finish", desc: "We show up when we say we will, set up as agreed, and leave the space as we found it." },
];

/* ─── Hooks ──────────────────────────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

function Reveal({ children, delay = 0, style = {}, className = "" }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.75s ease ${delay}s, transform 0.75s ease ${delay}s`,
      ...style,
    }}>{children}</div>
  );
}

function SectionLabel({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.1rem" }}>
      <div style={{ width: 32, height: 1, background: C.blue, opacity: 0.7 }} />
      <span style={{ color: C.blue, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{text}</span>
    </div>
  );
}

/* ─── Announcement Banner ────────────────────────────────────── */
function AnnouncementBanner({ dismissed, onDismiss, onActive }) {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (dismissed) { setCurrent(null); return; }
    api.getActiveAnnouncements()
      .then(data => {
        if (data.announcements?.length > 0) {
          const a = data.announcements[0];
          setCurrent({
            heading:   a.heading,
            content:   a.content,
            image:     a.image_url || null,
            startDate: a.start_date,
            endDate:   a.end_date,
          });
          onActive?.();
        }
      })
      .catch(() => {});
  }, [dismissed]);

  if (!current) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
      background: `linear-gradient(135deg, ${C.navyMid}, ${C.blue})`,
      padding: "12px 2rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, flexWrap: "wrap",
      animation: "slideDown 0.4s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
        {current.image && (
          <img src={current.image} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
        )}
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 600, color: C.white, marginBottom: 2 }}>{current.heading}</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{current.content}</div>
        </div>
      </div>
      <button onClick={() => { onDismiss(); setCurrent(null); }} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 2, color: C.white, cursor: "pointer", padding: "5px 14px", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
        Dismiss
      </button>
      <style>{`@keyframes slideDown { from { transform: translateY(-100%) } to { transform: translateY(0) } }`}</style>
    </div>
  );
}

/* ─── Navigation ─────────────────────────────────────────────── */
function Nav({ active, onQuote, hasBanner }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const fn = (e) => { if (!e.target.closest("#rr-nav")) setMenuOpen(false); };
    document.addEventListener("click", fn);
    return () => document.removeEventListener("click", fn);
  }, [menuOpen]);

  const go = (id) => {
    document.getElementById(id.toLowerCase())?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const topOffset = hasBanner ? 48 : 0;

  return (
    <nav id="rr-nav" style={{
      position: "fixed", left: 0, right: 0, top: topOffset, zIndex: 100,
      background: scrolled ? "rgba(3,17,46,0.97)" : "transparent",
      backdropFilter: scrolled ? "blur(14px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
      transition: "background 0.45s, border-color 0.45s, top 0.3s",
      padding: "0 clamp(1rem, 4vw, 2rem)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
        {/* Logo */}
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={LOGO_B64}
            alt="Refined Rentals"
            style={{
              height: 44,
              width: "auto",
              objectFit: "contain",
              opacity: scrolled ? 1 : 0.92,
              filter: scrolled ? "brightness(1.1)" : "brightness(1) drop-shadow(0 0 8px rgba(33,150,196,0.3))",
              transition: "opacity 0.4s, filter 0.4s",
            }}
          />
        </button>

        {/* Burger */}
        <button onClick={() => setMenuOpen(o => !o)} aria-label="Menu"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
          <span style={{ display: "block", height: 1.5, background: C.white, borderRadius: 2, width: menuOpen ? 22 : 24, transition: "all 0.3s", transform: menuOpen ? "rotate(45deg) translateY(6.5px)" : "none", transformOrigin: "center" }} />
          <span style={{ display: "block", width: 22, height: 1.5, background: C.white, borderRadius: 2, transition: "all 0.3s", opacity: menuOpen ? 0 : 1 }} />
          <span style={{ display: "block", height: 1.5, background: C.white, borderRadius: 2, width: menuOpen ? 22 : 18, transition: "all 0.3s", transform: menuOpen ? "rotate(-45deg) translateY(-6.5px)" : "none", transformOrigin: "center" }} />
        </button>
      </div>

      {/* Dropdown */}
      <div style={{ overflow: "hidden", maxHeight: menuOpen ? 400 : 0, transition: "max-height 0.35s cubic-bezier(.25,.46,.45,.94)", background: "rgba(3,17,46,0.98)", borderTop: menuOpen ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
        <div style={{ padding: "0.5rem clamp(1rem, 4vw, 2rem) 1.5rem" }}>
          {NAV_LINKS.map(link => (
            <button key={link} onClick={() => go(link)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: active === link.toLowerCase() ? C.blue : "rgba(255,255,255,0.7)", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: active === link.toLowerCase() ? 600 : 400, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontFamily: "'DM Sans', system-ui, sans-serif", transition: "color 0.2s" }}>
              {link}
              {active === link.toLowerCase() && <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.blue, flexShrink: 0 }} />}
            </button>
          ))}
          <button onClick={() => { setMenuOpen(false); onQuote(null); }} style={{ marginTop: "1rem", width: "100%", background: C.blue, border: "none", color: C.white, cursor: "pointer", padding: "13px", borderRadius: 1, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Get a Quote</button>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ───────────────────────────────────────────────────── */
function Hero({ onQuote }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 80); return () => clearTimeout(t); }, []);
  const fade = d => ({ opacity: ready ? 1 : 0, transform: ready ? "translateY(0)" : "translateY(22px)", transition: `opacity 0.9s ease ${d}s, transform 0.9s ease ${d}s` });

  return (
    <section id="home" style={{ minHeight: "100vh", position: "relative", display: "flex", alignItems: "center", background: `linear-gradient(168deg, ${C.navy} 0%, #051638 55%, #081f52 100%)`, overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: "-10%", top: "8%", width: "48vw", height: "48vw", maxWidth: 620, maxHeight: 620, borderRadius: "50%", border: "1px solid rgba(33,150,196,0.09)" }} />
        <div style={{ position: "absolute", right: "-4%", top: "18%", width: "32vw", height: "32vw", maxWidth: 420, maxHeight: 420, borderRadius: "50%", border: "1px solid rgba(33,150,196,0.05)" }} />
        <div style={{ position: "absolute", top: "20%", bottom: "20%", left: "50%", width: 1, background: "linear-gradient(to bottom, transparent, rgba(33,150,196,0.06), transparent)" }} />
      </div>

      <div className="rr-hero-grid" style={{ width: "100%", position: "relative", zIndex: 2, padding: "0 clamp(1.5rem, 5vw, 3rem)", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "clamp(3rem, 6vw, 6rem)", alignItems: "center" }}>
        <div>
          <h1 style={{ ...fade(0.18), fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(2.6rem, 4.5vw, 4.8rem)", fontWeight: 500, color: C.white, lineHeight: 1.06, margin: "0 0 1.75rem", letterSpacing: "-0.01em" }}>
            Elevating Events.<br />
            <span style={{ color: C.blue, fontStyle: "italic" }}>Redefining</span>{" "}What Luxury Looks Like.
          </h1>
          <p style={{ ...fade(0.3), color: "rgba(255,255,255,0.45)", fontSize: "clamp(0.9rem, 1.3vw, 1rem)", lineHeight: 1.85, maxWidth: 400, margin: "0 0 2.5rem", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300 }}>
            Frame tents, VIP mobile facilities, and premium carpeting for weddings, corporate events, and celebrations across Lesotho.
          </p>
          <div style={{ ...fade(0.42), display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button onClick={() => onQuote(null)} style={{ background: C.blue, border: "none", cursor: "pointer", color: C.white, padding: "14px 32px", borderRadius: 1, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", transition: "background 0.25s", whiteSpace: "nowrap" }} onMouseEnter={e => e.currentTarget.style.background = C.blueLight} onMouseLeave={e => e.currentTarget.style.background = C.blue}>Request a Quote</button>
            <button onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.18)", cursor: "pointer", color: "rgba(255,255,255,0.65)", padding: "14px 32px", borderRadius: 1, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500, fontFamily: "'DM Sans', system-ui, sans-serif", transition: "border-color 0.25s, color 0.25s", whiteSpace: "nowrap" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; e.currentTarget.style.color = C.white; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}>See Our Services</button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "3rem" }}>
          <div style={{ opacity: ready ? 1 : 0, transition: "opacity 0.9s ease 0.28s" }}>
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(1.05rem, 1.6vw, 1.3rem)", fontWeight: 400, fontStyle: "italic", color: "rgba(255,255,255,0.32)", lineHeight: 1.6, margin: 0 }}>
              Everything Your Event Needs,<br />Handled With Care.
            </p>
          </div>
          <div style={{ width: "60%", height: 1, background: "rgba(33,150,196,0.15)", opacity: ready ? 1 : 0, transition: "opacity 0.9s ease 0.38s" }} />
          <div style={{ display: "flex", gap: "clamp(1.5rem, 3vw, 2.5rem)", opacity: ready ? 1 : 0, transition: "opacity 0.9s ease 0.5s" }}>
            {[["4","Rental Categories"],["100%","Custom Setups"],["Lesotho","Wide Coverage"]].map(([val, lab]) => (
              <div key={lab}>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 500, color: C.white, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginTop: 3, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{lab}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@media(max-width:680px){.rr-hero-grid{grid-template-columns:1fr!important;padding-top:100px!important}}`}</style>
    </section>
  );
}

/* ─── Services ───────────────────────────────────────────────── */
function Services({ onQuote }) {
  return (
    <section id="services" style={{ background: C.offWhite, padding: "clamp(3rem, 5vw, 4.5rem) clamp(1.25rem, 5vw, 4rem)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: "3.75rem", maxWidth: 560 }}>
          <SectionLabel text="What We Offer" />
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(2.1rem, 4vw, 3.25rem)", fontWeight: 500, color: C.navy, margin: 0, lineHeight: 1.12 }}>Our Services</h2>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(255px, 1fr))", gap: 20 }}>
          {SERVICES.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.08}>
              <ServiceCard service={s} onQuote={onQuote} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ service: s, onQuote }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ background: C.white, border: `1px solid ${hovered ? "rgba(33,150,196,0.25)" : "rgba(0,0,0,0.07)"}`, borderRadius: 2, padding: "2.25rem 2rem", transition: "border-color 0.3s, box-shadow 0.3s, transform 0.3s", transform: hovered ? "translateY(-5px)" : "translateY(0)", boxShadow: hovered ? "0 16px 48px rgba(3,17,46,0.09)" : "none", cursor: "default", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.blue}, ${C.blueLight})`, transform: hovered ? "scaleX(1)" : "scaleX(0)", transformOrigin: "left", transition: "transform 0.35s ease" }} />
      <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.blue, fontWeight: 600, marginBottom: "1.5rem", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{s.tag}</div>
      <div style={{ color: C.navyMid, marginBottom: "1.25rem", opacity: 0.75 }}>{s.icon}</div>
      <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: C.slate, fontWeight: 500, marginBottom: "0.5rem", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{s.subtitle}</div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.45rem", fontWeight: 600, color: C.navy, margin: "0 0 0.9rem", lineHeight: 1.25 }}>{s.title}</h3>
      <p style={{ color: C.slate, lineHeight: 1.78, fontSize: "0.9rem", margin: "0 0 1.75rem", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300, flexGrow: 1 }}>{s.description}</p>
      <button onClick={() => onQuote(s.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: C.blue, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", gap: 7, transition: "gap 0.2s", alignSelf: "flex-start" }} onMouseEnter={e => e.currentTarget.style.gap = "11px"} onMouseLeave={e => e.currentTarget.style.gap = "7px"}>
        Request a Quote <span style={{ fontSize: 14, lineHeight: 1 }}>→</span>
      </button>
    </div>
  );
}

/* ─── About ──────────────────────────────────────────────────── */
function About({ onQuote }) {
  return (
    <section id="about" style={{ background: C.navyMid, padding: "clamp(5rem, 9vw, 8rem) clamp(1.25rem, 5vw, 4rem)", position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", right: "-8%", bottom: "-10%", width: "38vw", height: "38vw", maxWidth: 480, maxHeight: 480, borderRadius: "50%", border: "1px solid rgba(33,150,196,0.07)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="rr-about-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(3rem, 7vw, 6rem)", alignItems: "start" }}>
          <Reveal>
            <SectionLabel text="Who We Are" />
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(2.1rem, 3.8vw, 3rem)", fontWeight: 500, color: C.white, margin: "0 0 1.5rem", lineHeight: 1.12 }}>
              Built for Events That <span style={{ color: C.blue, fontStyle: "italic" }}>Deserve Better</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.52)", lineHeight: 1.85, fontSize: "0.97rem", marginBottom: "1.1rem", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300 }}>Refined Rentals was started with a clear purpose: to bring properly maintained, good-looking event equipment to Lesotho. Not just something to fill a space, but rental items that actually add to what your event looks and feels like.</p>
            <p style={{ color: "rgba(255,255,255,0.52)", lineHeight: 1.85, fontSize: "0.97rem", marginBottom: "2.5rem", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300 }}>From weddings and corporate functions to smaller private gatherings, we work with clients who care about the details. We do too.</p>
            <button onClick={() => onQuote(null)} style={{ background: "transparent", border: `1px solid ${C.blue}`, cursor: "pointer", color: C.blue, padding: "13px 30px", borderRadius: 1, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", transition: "background 0.25s, color 0.25s" }} onMouseEnter={e => { e.currentTarget.style.background = C.blue; e.currentTarget.style.color = C.white; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.blue; }}>Get In Touch</button>
          </Reveal>
          <Reveal delay={0.15}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {WHY_US.map(item => (
                <div key={item.num} style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 2, padding: "1.5rem 1.25rem", transition: "border-color 0.3s, background 0.3s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(33,150,196,0.2)"; e.currentTarget.style.background = "rgba(33,150,196,0.05)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.4rem", color: C.blue, fontWeight: 500, marginBottom: "0.75rem", opacity: 0.6 }}>{item.num}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.05rem", fontWeight: 600, color: C.white, marginBottom: "0.5rem", lineHeight: 1.3 }}>{item.label}</div>
                  <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.83rem", lineHeight: 1.65, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
      <style>{`@media(max-width:768px){.rr-about-grid{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}

/* ─── Gallery Film Reel ──────────────────────────────────────── */
function Gallery() {
  const [slides, setSlides] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);
  const animRef = useRef(null);
  const posRef = useRef(0);
  const lastTRef = useRef(null);

  // Load gallery from the Admin Gallery API — this is the only source of images
  useEffect(() => {
    api.getGallery("main")
      .then(data => {
        setSlides((data.gallery || []).map(item => ({
          src:   `http://localhost:3001${item.url}`,
          label: item.label || "",
          type:  item.type,
        })));
      })
      .catch(err => console.error("Gallery load error:", err))
      .finally(() => setLoaded(true));
  }, []);

  // Card dimensions — varied widths for cinematic feel
  const CARD_H = 340;
  const SPEED  = 0.18; // px per ms

  // Each card gets a fixed width and vertical offset for depth/stagger
  const cards = slides.map((sl, i) => {
    const widths  = [320, 280, 360, 300, 340, 270, 390];
    const offsets = [0, 20, -12, 28, -6, 16, -20]; // vertical parallax offsets
    const scales  = [1, 0.93, 1.04, 0.96, 1.02, 0.91, 1.06];
    return {
      ...sl,
      w: widths[i % widths.length],
      dy: offsets[i % offsets.length],
      scale: scales[i % scales.length],
    };
  });

  // Total track width (cards + gaps)
  const GAP = 20;
  const totalW = cards.reduce((s, c) => s + c.w + GAP, 0);

  // Animation loop — requestAnimationFrame scroll
  useEffect(() => {
    const track = trackRef.current;
    if (!track || totalW === 0) return;

    const tick = (ts) => {
      if (!paused) {
        if (lastTRef.current !== null) {
          const dt = ts - lastTRef.current;
          posRef.current += SPEED * dt;
          // Seamless loop: when scrolled one full set, reset
          if (posRef.current >= totalW) posRef.current -= totalW;
        }
        lastTRef.current = ts;
        track.style.transform = `translateX(${-posRef.current}px)`;
      } else {
        lastTRef.current = null;
      }
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [paused, totalW]);

  // Lightbox escape
  useEffect(() => {
    if (!lightbox) return;
    const fn = e => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [lightbox]);

  // Duplicate slides 3× so loop is always seamless regardless of viewport width
  const allCards = [...cards, ...cards, ...cards];

  return (
    <section id="gallery" style={{ background: C.navy, padding: "clamp(5rem, 9vw, 8rem) 0", overflow: "hidden" }}>

      {/* Heading */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(1.25rem, 5vw, 4rem)", marginBottom: "3rem" }}>
        <Reveal>
          <SectionLabel text="Our Work" />
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(2.1rem, 4vw, 3.25rem)", fontWeight: 500, color: C.white, margin: 0, lineHeight: 1.12 }}>Equipment in Action</h2>
        </Reveal>
      </div>

      {/* Film reel track — only once the Admin Gallery has images */}
      {slides.length === 0 ? (
        loaded && (
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(1.25rem, 5vw, 4rem)", textAlign: "center", color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300, fontSize: "0.95rem" }}>
            Gallery coming soon.
          </div>
        )
      ) : (
      <div
        style={{ position: "relative", overflow: "hidden", height: CARD_H + 60, cursor: "grab" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Left / right fade vignette */}
        <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none", background: `linear-gradient(to right, ${C.navy} 0%, transparent 8%, transparent 92%, ${C.navy} 100%)` }} />

        {/* Scrolling track */}
        <div
          ref={trackRef}
          style={{
            display: "flex",
            alignItems: "center",
            gap: GAP,
            width: "max-content",
            height: "100%",
            willChange: "transform",
            paddingLeft: 40,
          }}
        >
          {allCards.map((card, idx) => (
            <div
              key={idx}
              onClick={() => setLightbox(card)}
              style={{
                position: "relative",
                flexShrink: 0,
                width: card.w,
                height: CARD_H * card.scale,
                marginTop: card.dy,
                borderRadius: 3,
                overflow: "hidden",
                cursor: "zoom-in",
                boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
                transition: "box-shadow 0.3s",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 12px 52px rgba(33,150,196,0.25)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.45)"}
            >
              {card.type === "video" ? (
                <video
                  src={card.src}
                  autoPlay muted loop playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <img
                  src={card.src}
                  alt={card.label || ""}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
              {/* Bottom gradient + label */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(3,17,46,0.7) 0%, transparent 45%)" }} />
              {card.label && (
                <div style={{ position: "absolute", bottom: 10, left: 12, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 400 }}>
                  {card.label}
                </div>
              )}
              {/* Film-strip perforation dots — top and bottom */}
              {[0, 1].map(edge => (
                <div key={edge} aria-hidden style={{ position: "absolute", [edge === 0 ? "top" : "bottom"]: 6, left: 0, right: 0, display: "flex", justifyContent: "space-around", pointerEvents: "none" }}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} style={{ width: 6, height: 6, borderRadius: 1, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }} />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Pause hint */}
        {paused && (
          <div style={{ position: "absolute", bottom: 14, right: 20, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', system-ui, sans-serif", zIndex: 3, pointerEvents: "none" }}>
            Paused · Click to open
          </div>
        )}
      </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(2,8,22,0.95)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", cursor: "zoom-out" }}>
          {lightbox.type === "video" ? (
            <video src={lightbox.src} autoPlay muted loop playsInline style={{ maxWidth: "88vw", maxHeight: "86vh", borderRadius: 3, display: "block" }} onClick={e => e.stopPropagation()} />
          ) : (
            <img src={lightbox.src} alt="" style={{ maxWidth: "88vw", maxHeight: "86vh", objectFit: "contain", borderRadius: 3, display: "block" }} />
          )}
          <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(3,17,46,0.7)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", color: "rgba(255,255,255,0.75)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
      )}
    </section>
  );
}

/* ─── Contact ────────────────────────────────────────────────── */
function Contact({ onQuote }) {
  const [contactImages, setContactImages] = useState([]);

  useEffect(() => {
    api.getGallery("contact")
      .then(data => setContactImages(data.gallery || []))
      .catch(err => console.error("Contact gallery load error:", err));
  }, []);

  return (
    <section id="contact" style={{ background: C.navy, padding: "clamp(5rem, 9vw, 8rem) clamp(1.25rem, 5vw, 4rem)", position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", left: "-6%", top: "5%", width: "32vw", height: "32vw", maxWidth: 400, maxHeight: 400, borderRadius: "50%", border: "1px solid rgba(33,150,196,0.06)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="rr-contact-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: "clamp(3rem, 7vw, 6rem)", alignItems: "start" }}>
          <Reveal>
            <SectionLabel text="Get In Touch" />
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(2.1rem, 3.8vw, 3rem)", fontWeight: 500, color: C.white, margin: "0 0 1.25rem", lineHeight: 1.12 }}>Tell Us About<br /><span style={{ color: C.blue, fontStyle: "italic" }}>Your Event</span></h2>
            <p style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.8, fontSize: "0.93rem", marginBottom: "2.75rem", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300 }}>Prefer to get a quote quickly? Use the button below and we will come back to you with everything you need.</p>
            <button onClick={() => onQuote(null)} style={{ background: C.blue, border: "none", cursor: "pointer", color: C.white, padding: "14px 30px", borderRadius: 1, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", transition: "background 0.25s", marginBottom: "2.5rem" }} onMouseEnter={e => e.currentTarget.style.background = C.blueLight} onMouseLeave={e => e.currentTarget.style.background = C.blue}>Open Quote Form</button>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[{ label: "Phone", values: ["+266 6363 0598", "+266 5885 8114"] }, { label: "Email", values: ["refinedrentals.lso@gmail.com"] }, { label: "Facebook", values: ["Refined Rentals"] }].map(c => (
                <div key={c.label} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                  <div style={{ width: 1, alignSelf: "stretch", background: "rgba(33,150,196,0.25)", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.slate, marginBottom: 5, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{c.label}</div>
                    {c.values.map(v => <div key={v} style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.88rem", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300 }}>{v}</div>)}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            {contactImages.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 12 }}>
                {contactImages.map(img => (
                  <div key={img.id} style={{ position: "relative", paddingBottom: "66%", borderRadius: 2, overflow: "hidden", background: C.navyLight }}>
                    <img src={`http://localhost:3001${img.url}`} alt={img.label || ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(3,17,46,0.5), transparent)" }} />
                    {img.label && (
                      <div style={{ position: "absolute", bottom: 10, left: 12, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{img.label}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ border: "1px solid rgba(33,150,196,0.12)", borderRadius: 2, padding: "1.25rem" }}>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: "0.82rem", lineHeight: 1.7, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300, fontStyle: "italic" }}>
                "We don't just drop equipment and leave. Every setup is done properly, and we're available throughout your event if you need us."
              </p>
              <div style={{ marginTop: "0.75rem", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: C.blue, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Refined Rentals</div>
            </div>
          </Reveal>
        </div>
      </div>
      <style>{`@media(max-width:768px){.rr-contact-grid{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ background: "#010a1a", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "2.25rem clamp(1.25rem, 5vw, 4rem)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "rgba(255,255,255,0.55)", fontWeight: 500, fontSize: 16, letterSpacing: "0.06em" }}>Refined Rentals (PTY) LTD</div>
        <div style={{ color: "rgba(255,255,255,0.18)", fontSize: "0.77rem", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300 }}>&#169; {new Date().getFullYear()} &middot; Lesotho</div>
        <div style={{ display: "flex", gap: 24 }}>
          {NAV_LINKS.map(l => (
            <button key={l} onClick={() => document.getElementById(l.toLowerCase())?.scrollIntoView({ behavior: "smooth" })} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "rgba(255,255,255,0.25)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "'DM Sans', system-ui, sans-serif", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}>{l}</button>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ─── Quote Modal ────────────────────────────────────────────── */
function QuoteModal({ preselected, onClose, onSend }) {
  const emptyForm = {
    name: "", phone: "", email: "",
    event: "", location: "",
    duration: "single",
    date: "", startDate: "", endDate: "",
    services: preselected ? [preselected] : [],
    tentSize: "", tentConfig: "",
    other: "", message: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const overlayRef = useRef(null);
  const KNOWN_SERVICES = ["Frame Tents", "VIP Mobile Toilets", "Red Carpet", "Green Grass Carpet"];

  useEffect(() => {
    if (preselected && !form.services.includes(preselected)) setForm(f => ({ ...f, services: [preselected] }));
  }, [preselected]);

  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [onClose]);

  const toggleService = s => setForm(f => ({ ...f, services: f.services.includes(s) ? f.services.filter(x => x !== s) : [...f.services, s], ...(s !== "Frame Tents" ? {} : { tentSize: "", tentConfig: "" }) }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) { alert("Please fill in your name, phone, and email."); return; }
    setSubmitting(true);
    api.submitRequest({
      name:       form.name,
      phone:      form.phone,
      email:      form.email,
      event:      form.event,
      location:   form.location,
      duration:   form.duration,
      date:       form.date       || null,
      startDate:  form.startDate  || null,
      endDate:    form.endDate    || null,
      services:   form.services,
      tentSize:   form.tentSize   || null,
      tentConfig: form.tentConfig || null,
      other:      form.other      || null,
      message:    form.message    || null,
    })
      .then(() => { setSubmitting(false); setSubmitted(true); })
      .catch(err => {
        setSubmitting(false);
        alert("Something went wrong submitting your request. Please try again or call us directly.");
        console.error("Submit error:", err);
      });
  };

  const iSm = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: `1px solid rgba(41,171,226,0.2)`, borderRadius: 2, padding: "12px 14px", color: C.white, fontSize: "0.88rem", outline: "none", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300, transition: "border-color 0.25s" };
  const fi = e => { e.target.style.borderColor = C.blue; };
  const fo = e => { e.target.style.borderColor = "rgba(41,171,226,0.2)"; };
  const showTents = form.services.includes("Frame Tents");

  return (
    <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(2,10,28,0.88)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1.5rem 1rem", overflowY: "auto" }}>
      <div style={{ background: C.navyMid, border: "1px solid rgba(33,150,196,0.15)", borderRadius: 3, width: "100%", maxWidth: 640, padding: "2rem", position: "relative", marginBottom: "1.5rem" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", border: `1px solid ${C.blue}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
              <span style={{ color: C.blue, fontSize: 20 }}>✓</span>
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: C.white, fontSize: "1.7rem", fontWeight: 500, margin: "0 0 0.75rem" }}>Request Received</h3>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300, lineHeight: 1.7 }}>Someone from Refined Rentals will be in touch shortly with your quote.</p>
            <button onClick={onClose} style={{ marginTop: "1.5rem", background: "none", border: `1px solid ${C.blue}`, color: C.blue, padding: "10px 28px", borderRadius: 1, cursor: "pointer", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "1.75rem", paddingRight: 36 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.blue, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 600, marginBottom: 6 }}>Quote Request</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "1.6rem", fontWeight: 500, color: C.white, margin: "0 0 0.25rem" }}>Tell Us About Your Event</h3>
              {preselected && <p style={{ margin: 0, color: C.blue, fontSize: "0.83rem", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Requesting: <strong>{preselected}</strong></p>}
            </div>

            {/* Contact */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              {[["Full Name *","name","text"],["Phone Number *","phone","tel"]].map(([ph,key,type]) => (
                <input key={key} type={type} placeholder={ph} value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} onFocus={fi} onBlur={fo} style={iSm} />
              ))}
            </div>
            <input type="email" placeholder="Email Address *" value={form.email} onChange={e => setForm(f => ({...f,email:e.target.value}))} onFocus={fi} onBlur={fo} style={{...iSm, marginBottom: 10}} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <input type="text" placeholder="Event Type (e.g. Wedding)" value={form.event} onChange={e => setForm(f => ({...f,event:e.target.value}))} onFocus={fi} onBlur={fo} style={iSm} />
              <input type="text" placeholder="Location (e.g. Maseru)" value={form.location} onChange={e => setForm(f => ({...f,location:e.target.value}))} onFocus={fi} onBlur={fo} style={iSm} />
            </div>

            {/* Delivery info */}
            <div style={{ background: "rgba(33,150,196,0.07)", border: "1px solid rgba(33,150,196,0.18)", borderRadius: 2, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: C.blue, fontSize: 14, flexShrink: 0, marginTop: 1 }}>ℹ</span>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.55)", fontSize: "0.78rem", lineHeight: 1.65, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300 }}>
                <strong style={{ color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>Free delivery</strong> applies to events in and around Maseru. Events outside this area may be subject to a delivery fee based on your location. This will be confirmed in your quote.
              </p>
            </div>

            {/* Event duration */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Event Duration</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[["single","Single Day"],["overnight","Overnight"],["multiple","Multiple Days"]].map(([val,label]) => (
                  <button key={val} onClick={() => setForm(f => ({...f,duration:val,date:"",startDate:"",endDate:""}))} style={{ background: form.duration === val ? "rgba(33,150,196,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${form.duration === val ? C.blue : "rgba(255,255,255,0.09)"}`, borderRadius: 2, padding: "9px 8px", cursor: "pointer", color: form.duration === val ? C.white : "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8rem", fontWeight: form.duration === val ? 600 : 300, transition: "all 0.2s" }}>{label}</button>
                ))}
              </div>
              {(form.duration === "single" || form.duration === "overnight") && (
                <div>
                  <label style={{ display: "block", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{form.duration === "overnight" ? "Event Date (collection next morning)" : "Event Date"}</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({...f,date:e.target.value}))} onFocus={fi} onBlur={fo} style={iSm} />
                </div>
              )}
              {form.duration === "multiple" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Start Date</label>
                    <input type="date" value={form.startDate} onChange={e => setForm(f => ({...f,startDate:e.target.value}))} onFocus={fi} onBlur={fo} style={iSm} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6, fontFamily: "'DM Sans', system-ui, sans-serif" }}>End Date</label>
                    <input type="date" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({...f,endDate:e.target.value}))} onFocus={fi} onBlur={fo} style={iSm} />
                  </div>
                </div>
              )}
            </div>

            {/* Services */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Services Required</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {KNOWN_SERVICES.map(s => {
                  const active = form.services.includes(s);
                  return (
                    <div key={s} onClick={() => toggleService(s)} style={{ display: "flex", alignItems: "center", gap: 9, border: `1px solid ${active ? C.blue : "rgba(255,255,255,0.09)"}`, background: active ? "rgba(33,150,196,0.1)" : "transparent", borderRadius: 1, padding: "9px 11px", cursor: "pointer", transition: "all 0.2s" }}>
                      <div style={{ width: 14, height: 14, borderRadius: 1, border: `1.5px solid ${active ? C.blue : "rgba(255,255,255,0.2)"}`, background: active ? C.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {active && <span style={{ color: "white", fontSize: 9, fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)", fontSize: "0.8rem", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300 }}>{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tent size selector */}
            {showTents && (
              <div style={{ marginBottom: 14, background: "rgba(33,150,196,0.06)", border: "1px solid rgba(33,150,196,0.2)", borderRadius: 2, padding: "14px" }}>
                <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.blue, marginBottom: 10, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 600 }}>Tent Size and Configuration</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
                  {TENT_SIZES.map(ts => (
                    <div key={ts.id} style={{ border: `1px solid ${form.tentSize === ts.id ? C.blue : "rgba(255,255,255,0.1)"}`, borderRadius: 2, padding: "10px 12px", background: form.tentSize === ts.id ? "rgba(33,150,196,0.1)" : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all 0.2s" }} onClick={() => setForm(f => ({...f, tentSize: ts.id, tentConfig: ""}))}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: form.tentSize === ts.id ? 10 : 0 }}>
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 600, color: form.tentSize === ts.id ? C.white : "rgba(255,255,255,0.6)" }}>{ts.size}</span>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${form.tentSize === ts.id ? C.blue : "rgba(255,255,255,0.2)"}`, background: form.tentSize === ts.id ? C.blue : "transparent", flexShrink: 0 }} />
                      </div>
                      {form.tentSize === ts.id && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {ts.configs.map(cfg => (
                            <div key={cfg.id} onClick={e => { e.stopPropagation(); setForm(f => ({...f, tentConfig: cfg.id})); }} style={{ border: `1px solid ${form.tentConfig === cfg.id ? C.blue : "rgba(255,255,255,0.12)"}`, background: form.tentConfig === cfg.id ? "rgba(33,150,196,0.15)" : "transparent", borderRadius: 2, padding: "8px 10px", cursor: "pointer", transition: "all 0.2s" }}>
                              <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8rem", fontWeight: 600, color: form.tentConfig === cfg.id ? C.white : "rgba(255,255,255,0.55)", marginBottom: 3 }}>{cfg.label}</div>
                              <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 11, color: form.tentConfig === cfg.id ? C.blueLight : "rgba(255,255,255,0.3)" }}>{cfg.capacity}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic", lineHeight: 1.6 }}>* Capacities are estimates and may vary depending on your spacing preference.</p>
              </div>
            )}

            {/* Other */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Something Else in Mind?</div>
              <input type="text" placeholder="Describe what you need..." value={form.other} onChange={e => setForm(f => ({...f,other:e.target.value}))} onFocus={fi} onBlur={fo} style={{...iSm, marginBottom: 8}} />
              <div style={{ background: "rgba(33,150,196,0.07)", border: "1px solid rgba(33,150,196,0.15)", borderRadius: 1, padding: "9px 12px", display: "flex", gap: 9, alignItems: "flex-start" }}>
                <span style={{ color: C.blue, fontSize: 12, flexShrink: 0, marginTop: 1 }}>ℹ</span>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.38)", fontSize: "0.78rem", lineHeight: 1.65, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300 }}>We welcome enquiries for items not on our standard list. Please note that <strong style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>we will only provide a quote for services we are able to supply.</strong> We will let you know if we cannot accommodate a specific request.</p>
              </div>
            </div>

            <textarea placeholder="Anything else we should know..." value={form.message} onChange={e => setForm(f => ({...f,message:e.target.value}))} rows={3} onFocus={fi} onBlur={fo} style={{...iSm, resize: "vertical", marginBottom: 16}} />

            <button onClick={handleSubmit} disabled={submitting} style={{ width: "100%", background: submitting ? "rgba(33,150,196,0.45)" : C.blue, border: "none", borderRadius: 1, color: C.white, cursor: submitting ? "wait" : "pointer", padding: "15px", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {submitting ? "Sending..." : "Submit Quote Request"}
            </button>
            <p style={{ textAlign: "center", marginTop: 12, marginBottom: 0, color: "rgba(255,255,255,0.18)", fontSize: "0.75rem", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300 }}>We typically respond within one business day.</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────────── */
export default function App() {
  const [active, setActive] = useState("home");
  const [modal, setModal] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [hasBanner, setHasBanner] = useState(false);
  const openQuote = useCallback(s => setModal(s ?? ""), []);
  const closeQuote = useCallback(() => setModal(null), []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; width: 100%; overflow-x: hidden; background: #03112e; }
      #root { width: 100%; max-width: 100%; min-height: 100vh; background: #03112e; }
      ::-webkit-scrollbar { width: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(33,150,196,0.25); border-radius: 3px; }
    `;
    document.head.appendChild(style);

    const ids = ["home","services","about","gallery","contact"];
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }), { threshold: 0.35 });
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ margin: 0, padding: 0, width: "100%", overflowX: "hidden", background: C.navy }}>
      <AnnouncementBanner dismissed={bannerDismissed} onDismiss={() => { setBannerDismissed(true); setHasBanner(false); }} onActive={() => setHasBanner(true)} />
      <Nav active={active} onQuote={openQuote} hasBanner={hasBanner} />
      <Hero onQuote={openQuote} />
      <Services onQuote={openQuote} />
      <About onQuote={openQuote} />
      <Gallery />
      <Contact onQuote={openQuote} />
      <Footer />
      {modal !== null && <QuoteModal preselected={modal || null} onClose={closeQuote} onSend={closeQuote} />}
    </div>
  );
}