"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/app/components/LocaleProvider";

interface CommissionEntry {
  id: string;
  amountThb: number; // stores credits earned
  status: string;
  createdAt: string;
  referredUserId: string;
}

interface AffiliateStats {
  active: boolean;
  referralCode?: string;
  totalClicks?: number;
  totalReferrals?: number;
  totalCommissions?: number;
  totalCreditsEarned?: number;
  recentCommissions?: CommissionEntry[];
}

export default function AffiliatePage() {
  const { t } = useLocale();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/affiliate/stats");
      const data = await res.json();
      setStats(data);
    } catch {
      setStats({ active: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const res = await fetch("/api/affiliate/activate", { method: "POST" });
      const data = await res.json();
      if (data.code) {
        await fetchStats();
        setMessage("✅ เปิดใช้งาน Affiliate สำเร็จ!");
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch {
      setMessage("❌ เกิดข้อผิดพลาด");
    } finally {
      setActivating(false);
    }
  };

  const copyLink = () => {
    if (!stats?.referralCode) return;
    const link = `${window.location.origin}/api/ref/${stats.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center", padding: "80px 0" }}>
          <span className="spinner spinner-lg" style={{ margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  // Not active — show CTA
  if (!stats?.active) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: "600px" }}>
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🤝</div>
            <h1 style={{ fontSize: "2rem", marginBottom: "12px" }}>{t("aff.title")}</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", marginBottom: "32px", lineHeight: 1.7 }}>
              {t("aff.desc", { pct: 20 })}
            </p>

            <div className="card" style={{ textAlign: "left", marginBottom: "24px" }}>
              <h3 style={{ marginBottom: "16px", fontSize: "1.1rem" }}>{t("aff.benefits")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { icon: "🎁", text: t("aff.b1", { pct: 20 }) },
                  { icon: "⚡", text: t("aff.b2") },
                  { icon: "🔗", text: t("aff.b3") },
                  { icon: "📊", text: t("aff.b4") },
                  { icon: "🍪", text: t("aff.b5") },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              onClick={handleActivate}
              disabled={activating}
            >
              {activating ? (
                <><span className="spinner" /> {t("aff.activating")}</>
              ) : (
                t("aff.activate")
              )}
            </button>

            {message && (
              <div style={{ marginTop: "12px", padding: "10px 16px", borderRadius: "8px", background: message.startsWith("✅") ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)", fontSize: "0.9rem" }}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active — show dashboard
  const refLink = `${typeof window !== "undefined" ? window.location.origin : ""}/api/ref/${stats.referralCode}`;

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ marginBottom: "8px" }}>{t("aff.dashboard")}</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          {t("aff.dashDesc")}
        </p>

        {message && (
          <div style={{ marginBottom: "16px", padding: "10px 16px", borderRadius: "8px", background: message.startsWith("✅") ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)", fontSize: "0.9rem" }}>
            {message}
          </div>
        )}

        {/* Referral Link */}
        <div className="card" style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {t("aff.yourLink")}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              readOnly
              value={refLink}
              style={{
                flex: "1 1 200px",
                minWidth: 0,
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                fontFamily: "monospace",
              }}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button className="btn btn-primary" onClick={copyLink} style={{ flexShrink: 0 }}>
              {copied ? t("aff.copied") : t("aff.copy")}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid" style={{ marginBottom: "24px" }}>
          <div className="stat-card">
            <div className="stat-label">Clicks</div>
            <div className="stat-value">{(stats.totalClicks || 0).toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t("aff.signups")}</div>
            <div className="stat-value accent">{(stats.totalReferrals || 0).toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t("aff.commissions")}</div>
            <div className="stat-value">{(stats.totalCommissions || 0).toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t("aff.totalCredits")}</div>
            <div className="stat-value" style={{ color: "var(--success)" }}>
              {(stats.totalCreditsEarned || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
              credits
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="card" style={{ marginBottom: "24px", padding: "16px 20px" }}>
          <h3 style={{ marginBottom: "12px", fontSize: "1rem" }}>💡 {t("aff.howItWorks")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            <div>1. {t("aff.step1")}</div>
            <div>2. {t("aff.step2")}</div>
            <div>3. {t("aff.step3")}</div>
          </div>
        </div>

        {/* Commission History */}
        <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>🎁 {t("aff.commissionHistory")}</h2>
        {!stats.recentCommissions?.length ? (
          <div className="card">
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "24px 0" }}>
              {t("aff.noCommissions")}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {stats.recentCommissions.map((c) => (
              <div key={c.id} className="card" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--success)", fontWeight: 700, fontSize: "1rem" }}>
                    +{c.amountThb.toLocaleString()} credits
                  </span>
                  <span className="status-badge done" style={{ fontSize: "0.7rem" }}>
                    ✓ {t("aff.credited")}
                  </span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  {new Date(c.createdAt).toLocaleDateString("th-TH")} · {new Date(c.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
