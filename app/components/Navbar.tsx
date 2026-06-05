"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import { useState, useRef, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { useLocale } from "./LocaleProvider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/transcribe", label: "Transcribe" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pricing", label: "Pricing" },
  { href: "/api-docs", label: "API" },
  { href: "/affiliate", label: "Affiliate" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();
  const { locale, setLocale } = useLocale();

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    setMobileNavOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1.25rem",
          height: "56px",
          background: "rgba(11,14,23,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "sticky",
          top: 0,
          zIndex: 1000,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 800,
            fontSize: "1.2rem",
            letterSpacing: "-0.5px",
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <img
            src="/favicon-32x32.png"
            alt=""
            width={24}
            height={24}
            style={{ borderRadius: "4px", flexShrink: 0 }}
          />
          FastCaption
        </Link>

        {/* Desktop Nav links */}
        <div className="nav-links-desktop">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: active ? 600 : 400,
                  color: active ? "#fff" : "rgba(255,255,255,0.5)",
                  background: active ? "rgba(249,115,22,0.12)" : "transparent",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side: Lang + Auth + Hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Language Toggle */}
          <button
            onClick={() => setLocale(locale === "th" ? "en" : "th")}
            title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "0.78rem",
              fontWeight: 500,
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            🌐 {locale === "th" ? "TH" : "EN"}
          </button>

          {/* Auth area (desktop) */}
          <div className="auth-desktop" ref={menuRef}>
            {loading ? (
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "var(--surface-2)",
                animation: "pulse 1.5s ease infinite",
              }} />
            ) : user ? (
              <>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "4px 12px 4px 4px",
                    borderRadius: "99px",
                    border: "1px solid var(--border)",
                    background: menuOpen ? "var(--surface-2)" : "transparent",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                  }}
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt=""
                      width={28}
                      height={28}
                      style={{ borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #f97316, #1e3a5f)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}>
                      {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                    {(user.user_metadata?.full_name || user.email || "User").split(" ")[0]}
                  </span>
                  <span style={{ fontSize: "0.6rem", opacity: 0.5 }}>▼</span>
                </button>

                {menuOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "220px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                    overflow: "hidden",
                    zIndex: 50,
                  }}>
                    <div style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid var(--border)",
                    }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {user.user_metadata?.full_name || user.email}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {user.email}
                      </div>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: "block",
                        padding: "10px 16px",
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                        textDecoration: "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      📊 Dashboard
                    </Link>

                    <Link
                      href="/transcribe"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: "block",
                        padding: "10px 16px",
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                        textDecoration: "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      🎵 Transcribe
                    </Link>

                    <Link
                      href="/affiliate"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: "block",
                        padding: "10px 16px",
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                        textDecoration: "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      🤝 Affiliate
                    </Link>

                    <div style={{ height: "1px", background: "var(--border)" }} />

                    <button
                      onClick={handleSignOut}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        fontSize: "0.85rem",
                        color: "var(--error)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "inherit",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      🚪 ออกจากระบบ
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link
                href="/login"
                style={{
                  padding: "0.45rem 1.2rem",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Hamburger (mobile only) */}
          <button
            className="hamburger-btn"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle menu"
            style={{
              display: "none", /* shown via CSS on mobile */
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              color: "var(--text-primary)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileNavOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      {mobileNavOpen && (
        <div
          className="mobile-nav-overlay"
          style={{
            position: "fixed",
            top: "56px",
            left: 0,
            right: 0,
            bottom: 0,
            background: "var(--overlay-bg)",
            backdropFilter: "blur(4px)",
            zIndex: 999,
          }}
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            style={{
              background: "var(--surface)",
              borderBottom: "1px solid var(--border)",
              padding: "8px 0",
              animation: "slideDown 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {navLinks.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "block",
                    padding: "14px 24px",
                    fontSize: "1rem",
                    fontWeight: active ? 700 : 500,
                    color: active ? "var(--nav-text-active)" : "var(--nav-text)",
                    background: active ? "var(--nav-active-bg)" : "transparent",
                    textDecoration: "none",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </Link>
              );
            })}

            {/* Mobile auth */}
            <div style={{ borderTop: "1px solid var(--border)", padding: "8px 0" }}>
              {user ? (
                <>
                  <div style={{ padding: "12px 24px", display: "flex", alignItems: "center", gap: "10px" }}>
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt=""
                        width={32}
                        height={32}
                        style={{ borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #f97316, #ea580c)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "#fff",
                      }}>
                        {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {user.user_metadata?.full_name || user.email}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "14px 24px",
                      fontSize: "0.95rem",
                      color: "var(--error)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    ออกจากระบบ
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  style={{
                    display: "block",
                    padding: "14px 24px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--accent-light)",
                    textDecoration: "none",
                  }}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
