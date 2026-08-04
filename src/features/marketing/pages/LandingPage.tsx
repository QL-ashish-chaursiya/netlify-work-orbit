import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import "./LandingPage.css";

interface Star {
  id: number;
  size: number;
  top: number;
  left: number;
  duration: number;
  delay: number;
}

const NAV_LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#roles", label: "Roles" },
  { href: "#how-it-works", label: "How it works" },
];

const FEATURES = [
  {
    title: "Live Resource Directory",
    description:
      "Search everyone in your org by skill, experience band, and current utilization to see who's actually free right now, not who was free when the spreadsheet was last updated.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18">
        <circle cx="9" cy="9" r="3" fill="#5B93FF" />
        <circle cx="9" cy="9" r="7.5" fill="none" stroke="#5B93FF" strokeWidth="1.4" opacity="0.5" />
      </svg>
    ),
  },
  {
    title: "Real-Time Allocation",
    description: "The moment a request is approved, the allocation goes live. Utilization, the release calendar, and the Bench Report all update immediately, with no second system to reconcile.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18">
        <rect x="2.5" y="2.5" width="13" height="13" rx="3" fill="none" stroke="#5B93FF" strokeWidth="1.4" />
        <path d="M6 9h6M9 6v6" stroke="#5B93FF" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    title: "Bench Visibility, Not Guesswork",
    description: "Every organization sets its own idle threshold. Anyone who drops below it shows up on the Bench Report with their skills and last project attached, before they've been idle long enough to notice.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path d="M3 14l4-5 3 3 5-7" stroke="#5B93FF" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Role-Based Access, By Design",
    description: "Six built-in roles: Admin, Resource Manager, Project Manager, Tech Lead, Sales Lead, and Team Member. Each one sees exactly what their job requires, with every organization's data isolated at the database layer.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path d="M9 2l6 2.5v4c0 4-2.6 6.7-6 7.5-3.4-.8-6-3.5-6-7.5v-4L9 2z" fill="none" stroke="#5B93FF" strokeWidth="1.4" />
      </svg>
    ),
  },
];

const ROLES = [
  { role: "Admin", body: "Full visibility across the organization: every project, every allocation, every approval." },
  { role: "Resource Manager", body: "Owns the Approval Queue, arbitrates conflicts, and keeps utilization and Bench Reports honest." },
  { role: "Project Manager", body: "Builds role requirements, raises allocation requests, and moves projects through their lifecycle." },
  { role: "Tech Lead", body: "Searches for the right skills and keeps track of who's assigned to their team's work." },
  { role: "Sales Lead", body: "Logs POCs, tracks outcomes, and converts a closed-won opportunity straight into a project." },
  { role: "Team Member", body: "Sees their own assignments, upcoming releases, and profile, and nothing more." },
];

const STATS: { count: number; suffix: string; decimals: number; label: string }[] = [
  { count: 6, suffix: "", decimals: 0, label: "Role-based dashboards, one per seat" },
  { count: 5, suffix: "", decimals: 0, label: "Project lifecycle stages, Draft through Closed" },
  { count: 3, suffix: "", decimals: 0, label: "Ways an allocation winds down: release, extend, or reassign" },
  { count: 1, suffix: "", decimals: 0, label: "Approval Queue for every request, org-wide" },
];

const POINTS = [
  {
    title: "Requests are checked before they collide.",
    body: "Raise an allocation request and WorkOrbit checks it against existing commitments. Overlapping demand on the same person is flagged automatically, before it becomes a scheduling conflict.",
  },
  {
    title: "Approvals sit with the people accountable.",
    body: "Resource Managers and Admins clear requests from a single Approval Queue. Self-approval is blocked by design: no one signs off on their own request.",
  },
  {
    title: "Nobody goes looking for updates.",
    body: "Approvals, new assignments, upcoming releases, and POC outcomes each push an in-app notification the moment they happen, straight to the person it affects.",
  },
];

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path d="M2 6l3 3 5-6" stroke="#5B93FF" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrbitMark({ className }: { className?: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 260 260" className={className}>
      <g transform="rotate(-15 130 130)">
        <ellipse cx="130" cy="130" rx="95" ry="55" fill="none" stroke="#F5F7FC" strokeWidth="7" opacity="0.4" />
        <circle className="pulse" cx="225" cy="130" r="15" fill="#5B93FF" />
        <circle cx="130" cy="130" r="19" fill="#F5F7FC" />
      </g>
    </svg>
  );
}

export function LandingPage() {
  const { data: session } = useAuthSession();
  const rootRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showToTop, setShowToTop] = useState(false);
  const [spotlightActive, setSpotlightActive] = useState(false);

  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        size: Math.random() * 2 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 3,
      })),
    [],
  );

  // Scroll progress + back-to-top visibility.
  useEffect(() => {
    function onScroll() {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      setScrollProgress(max > 0 ? (scrolled / max) * 100 : 0);
      setShowToTop(scrolled > 500);
    }
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => document.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-triggered reveal (single + staggered groups), scoped to this page.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          if (target.classList.contains("stagger")) {
            const items = target.querySelectorAll<HTMLElement>(".reveal-item");
            items.forEach((el, i) => {
              setTimeout(() => el.classList.add("in-view"), i * 90);
            });
          } else {
            target.classList.add("in-view");
          }
          io.unobserve(target);
        });
      },
      { threshold: 0.15 },
    );
    root.querySelectorAll(".reveal, .stagger").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Count-up stats.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const countIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const target = parseFloat(el.dataset.count ?? "0");
          const suffix = el.dataset.suffix ?? "";
          const decimals = parseInt(el.dataset.decimal ?? "0", 10);
          const dur = 1400;
          const start = performance.now();
          function tick(now: number) {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            const val = target * eased;
            el.textContent = (decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()) + suffix;
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          countIo.unobserve(el);
        });
      },
      { threshold: 0.4 },
    );
    root.querySelectorAll<HTMLElement>(".num[data-count]").forEach((el) => countIo.observe(el));
    return () => countIo.disconnect();
  }, []);

  // Cursor spotlight, feature-card glow, orbit tilt — desktop + motion-ok only.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover)").matches;
    if (reduceMotion || !canHover) return;

    let sx = 0,
      sy = 0,
      tx = 0,
      ty = 0;
    let raf = 0;

    function onMouseMove(e: MouseEvent) {
      tx = e.clientX;
      ty = e.clientY;
      setSpotlightActive(true);
    }
    function onMouseLeave() {
      setSpotlightActive(false);
    }
    function animateSpotlight() {
      sx += (tx - sx) * 0.12;
      sy += (ty - sy) * 0.12;
      const el = root!.querySelector<HTMLElement>(".spotlight");
      if (el) el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(animateSpotlight);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);
    raf = requestAnimationFrame(animateSpotlight);

    const cards = root.querySelectorAll<HTMLElement>(".feature-card");
    function onCardMove(this: HTMLElement, e: MouseEvent) {
      const r = this.getBoundingClientRect();
      this.style.setProperty("--mx", `${e.clientX - r.left}px`);
      this.style.setProperty("--my", `${e.clientY - r.top}px`);
    }
    cards.forEach((card) => card.addEventListener("mousemove", onCardMove));

    const orbitSvg = orbitRef.current?.querySelector<SVGElement>("svg");
    const orbitVisual = orbitRef.current;
    function onOrbitMove(e: MouseEvent) {
      if (!orbitVisual || !orbitSvg) return;
      const r = orbitVisual.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      orbitSvg.style.transform = `rotateY(${px * 14}deg) rotateX(${-py * 14}deg)`;
    }
    function onOrbitLeave() {
      if (orbitSvg) orbitSvg.style.transform = "rotateY(0deg) rotateX(0deg)";
    }
    orbitVisual?.addEventListener("mousemove", onOrbitMove);
    orbitVisual?.addEventListener("mouseleave", onOrbitLeave);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(raf);
      cards.forEach((card) => card.removeEventListener("mousemove", onCardMove));
      orbitVisual?.removeEventListener("mousemove", onOrbitMove);
      orbitVisual?.removeEventListener("mouseleave", onOrbitLeave);
    };
  }, []);

  return (
    <div className="wo-landing" ref={rootRef}>
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />
      <div className={`spotlight${spotlightActive ? " active" : ""}`} />

      <div className="ambient">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grain" />
        <div className="stars">
          {stars.map((s) => (
            <div
              key={s.id}
              className="star"
              style={{
                width: s.size,
                height: s.size,
                top: `${s.top}%`,
                left: `${s.left}%`,
                animationDuration: `${s.duration}s`,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
        </div>
      </div>

      <header>
        <div className="wrap">
          <nav>
            <div className="logo">
              <OrbitMark className="logo-mark-anim" />
              <div className="logo-text">
                Work<b>Orbit</b>
              </div>
            </div>
            <div className="nav-links">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.label}
                </a>
              ))}
            </div>
            <div className="nav-cta">
              {session ? (
                <Link className="btn btn-primary btn-sm" to="/dashboard">
                  Dashboard
                </Link>
              ) : (
                <Link className="signin" to="/login">
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <div className="eyebrow">WORKFORCE ORCHESTRATION PLATFORM</div>
              <h1>
                Keep Your
                <br />
                Workforce <span className="accent">in Motion</span>
              </h1>
              <p className="sub">
                One live view of who's allocated, who's free, and what's coming next, so staffing decisions stop
                happening in spreadsheets and side conversations, and every project starts fully staffed.
              </p>
              <div className="hero-ctas">
                <a className="btn btn-primary" href="#how-it-works">
                  See How It Works
                </a>
              </div>
            </div>

            <div className="orbit-visual" ref={orbitRef}>
              <div className="orbit-glow" />
              <svg viewBox="0 0 600 600">
                <defs>
                  <path
                    id="orbitPathHero"
                    d="M 80,300 A 220,130 0 1 0 520,300 A 220,130 0 1 0 80,300 Z"
                  />
                  <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#5B93FF" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#5B93FF" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <g transform="rotate(-15 300 300)">
                  <use href="#orbitPathHero" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                  <ellipse cx="300" cy="300" rx="130" ry="130" fill="url(#hubGlow)" />
                  <circle cx="300" cy="300" r="30" fill="#F5F7FC" />
                  <circle cx="300" cy="300" r="30" fill="none" stroke="#5B93FF" strokeWidth="1.5" opacity="0.6" />

                  <circle r="7" fill="#00D4FF" opacity="0.85">
                    <animateMotion dur="5.5s" repeatCount="indefinite" rotate="auto">
                      <mpath href="#orbitPathHero" />
                    </animateMotion>
                  </circle>
                  <circle r="4" fill="#2F6FFF" opacity="0.55">
                    <animateMotion dur="8s" begin="0.18s" repeatCount="indefinite">
                      <mpath href="#orbitPathHero" />
                    </animateMotion>
                  </circle>
                  <circle r="6" fill="#2F6FFF" opacity="0.75">
                    <animateMotion dur="8s" begin="0.36s" repeatCount="indefinite">
                      <mpath href="#orbitPathHero" />
                    </animateMotion>
                  </circle>
                  <circle r="9" fill="#2F6FFF" opacity="0.9">
                    <animateMotion dur="8s" begin="0.54s" repeatCount="indefinite">
                      <mpath href="#orbitPathHero" />
                    </animateMotion>
                  </circle>
                  <circle r="13" fill="#5B93FF">
                    <animateMotion dur="8s" begin="0.72s" repeatCount="indefinite">
                      <mpath href="#orbitPathHero" />
                    </animateMotion>
                  </circle>
                </g>
              </svg>
            </div>
          </div>
        </div>
        <div className="scroll-cue">
          <span>Scroll</span>
          <div className="wheel" />
        </div>
      </section>

      <section id="platform" className="section-alt">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">THE PLATFORM</div>
            <h2>One system. Every allocation decision.</h2>
            <p>
              WorkOrbit replaces the spreadsheet-and-email version of staffing with one shared system. Role
              requirements, requests, approvals, and releases all live in the same place your team already works in.
            </p>
          </div>

          <div className="feature-grid stagger">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card reveal-item">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="roles">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">BUILT FOR EVERY SEAT</div>
            <h2>Everyone sees exactly what their job needs</h2>
            <p>Six roles, six purpose-built views, and no one wades through screens meant for someone else's job.</p>
          </div>

          <div className="role-grid stagger">
            {ROLES.map((r) => (
              <div key={r.role} className="role-card reveal-item">
                <h3>{r.role}</h3>
                <p>{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="stats-band">
        <div className="wrap">
          <div className="stats-grid stagger">
            {STATS.map((s) => (
              <div key={s.label} className="stat reveal-item">
                <div className="num" data-count={s.count} data-suffix={s.suffix} data-decimal={s.decimals}>
                  0{s.suffix}
                </div>
                <div className="label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section id="how-it-works">
        <div className="wrap">
          <div className="deepdive">
            <div className="reveal">
              <div className="eyebrow">HOW IT WORKS</div>
              <h2 style={{ fontSize: 32, marginTop: 16 }}>One workflow, from request to release</h2>
              <div className="point-list">
                {POINTS.map((pt) => (
                  <div key={pt.title} className="point">
                    <div className="check">
                      <CheckIcon />
                    </div>
                    <p>
                      <b>{pt.title}</b> {pt.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="deepdive-visual reveal">
              <svg viewBox="0 0 400 340" width="100%">
                <defs>
                  <path id="orbitPathSmall" d="M 60,170 A 140,80 0 1 0 340,170 A 140,80 0 1 0 60,170 Z" />
                </defs>
                <g transform="rotate(-12 200 170)">
                  <use href="#orbitPathSmall" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.3" />
                  <circle cx="200" cy="170" r="20" fill="#F5F7FC" />
                  <circle r="9" fill="#5B93FF">
                    <animateMotion dur="6s" repeatCount="indefinite">
                      <mpath href="#orbitPathSmall" />
                    </animateMotion>
                  </circle>
                  <circle r="6" fill="#2F6FFF" opacity="0.7">
                    <animateMotion dur="6s" begin="1.4s" repeatCount="indefinite">
                      <mpath href="#orbitPathSmall" />
                    </animateMotion>
                  </circle>
                  <circle r="6" fill="#00D4FF" opacity="0.8">
                    <animateMotion dur="9s" repeatCount="indefinite">
                      <mpath href="#orbitPathSmall" />
                    </animateMotion>
                  </circle>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="section-alt">
        <div className="wrap">
          <div className="cta-band reveal">
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              GET STARTED
            </div>
            <h2 style={{ marginTop: 16 }}>Ready to put your workforce in motion?</h2>
            <p>
              {session
                ? "Jump back into your dashboard and keep your workforce moving."
                : "Sign in and see WorkOrbit running against your own team's setup."}
            </p>
            <div className="hero-ctas">
              {session ? (
                <Link className="btn btn-primary" to="/dashboard">
                  Dashboard
                </Link>
              ) : (
                <Link className="btn btn-primary" to="/login">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="logo">
                <OrbitMark />
                <div className="logo-text">
                  Work<b>Orbit</b>
                </div>
              </div>
              <p>Workforce orchestration for teams that can't afford idle time or missed deadlines.</p>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <a href="#platform">Platform</a>
              <a href="#roles">Roles</a>
              <a href="#how-it-works">How it works</a>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <Link to="/login">Sign in</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <div>© 2026 WorkOrbit. All rights reserved.</div>
          </div>
        </div>
      </footer>

      <div className={`to-top${showToTop ? " show" : ""}`} title="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M8 13V3M3 7l5-5 5 5" stroke="#F5F7FC" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
