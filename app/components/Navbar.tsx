"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/transcribe", label: "Transcribe" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pricing", label: "Pricing" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        height: "60px",
        background: "rgba(10,10,10,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          fontWeight: 800,
          fontSize: "1.3rem",
          letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textDecoration: "none",
        }}
      >
        FastCaption
      </Link>

      {/* Nav links */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {navLinks.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: "8px",
                fontSize: "0.9rem",
                fontWeight: active ? 600 : 400,
                color: active ? "#fff" : "rgba(255,255,255,0.6)",
                background: active ? "rgba(167,139,250,0.15)" : "transparent",
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Auth area */}
      <div style={{ position: "relative" }} ref={menuRef}>
        {status === "loading" ? (
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            animation: "pulse 1.5s ease infinite",
          }} />
        ) : session?.user ? (
          /* Logged in — user avatar/menu */
          <>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 12px 4px 4px",
                borderRadius: "99px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: menuOpen ? "rgba(255,255,255,0.08)" : "transparent",
                color: "#fff",
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "inherit",
              }}
            >
              {session.user.image ? (
                <img
                  src={session.user.image}
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
                  background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}>
                  {(session.user.name || "U")[0].toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                {session.user.name?.split(" ")[0] || "User"}
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
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                overflow: "hidden",
                zIndex: 50,
              }}>
                <div style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--border)",
                }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {session.user.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {session.user.email}
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

                <div style={{ height: "1px", background: "var(--border)" }} />

                <button
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
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
          /* Not logged in */
          <Link
            href="/login"
            style={{
              padding: "0.45rem 1.2rem",
              borderRadius: "8px",
              fontSize: "0.9rem",
              fontWeight: 600,
              background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
              color: "#fff",
              textDecoration: "none",
            }}
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
