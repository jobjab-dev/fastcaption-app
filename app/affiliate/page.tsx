"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/app/components/LocaleProvider";

interface CommissionEntry {
  id: string;
  amountThb: number;
  status: string;
  createdAt: string;
  referredUserId: string;
}

interface PayoutEntry {
  id: string;
  amountThb: number;
  method: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
}

interface AffiliateStats {
  active: boolean;
  referralCode?: string;
  totalClicks?: number;
  totalReferrals?: number;
  totalCommissions?: number;
  totalEarned?: number;
  pendingBalance?: number;
  paidBalance?: number;
  recentCommissions?: CommissionEntry[];
  payoutRequests?: PayoutEntry[];
  canRequestPayout?: boolean;
  minPayoutThb?: number;
}

export default function AffiliatePage() {
  const { t } = useLocale();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [payoutForm, setPayoutForm] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<"bank_transfer" | "promptpay">("promptpay");
  const [accountInfo, setAccountInfo] = useState("");
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
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

  const handlePayout = async () => {
    if (!accountInfo.trim()) {
      setMessage("❌ กรุณากรอกข้อมูลบัญชี");
      return;
    }
    setPayoutSubmitting(true);
    try {
      const res = await fetch("/api/affiliate/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: payoutMethod, accountInfo }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("✅ ส่งคำขอเบิกเงินแล้ว! รอ admin อนุมัติ");
        setPayoutForm(false);
        setAccountInfo("");
        await fetchStats();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch {
      setMessage("❌ เกิดข้อผิดพลาด");
    } finally {
      setPayoutSubmitting(false);
    }
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
                  { icon: "💰", text: t("aff.b1", { pct: 20 }) },
                  { icon: "🔗", text: t("aff.b2") },
                  { icon: "📊", text: t("aff.b3") },
                  { icon: "💸", text: t("aff.b4", { amount: "500" }) },
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
            <div className="stat-label">{t("aff.pending")}</div>
            <div className="stat-value" style={{ color: "var(--warning)" }}>
              ฿{(stats.pendingBalance || 0).toLocaleString()}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t("aff.totalEarned")}</div>
            <div className="stat-value" style={{ color: "var(--success)" }}>
              ฿{(stats.totalEarned || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Payout Section */}
        {stats.canRequestPayout && !payoutForm && (
          <button
            className="btn btn-primary"
            style={{ marginBottom: "24px" }}
            onClick={() => setPayoutForm(true)}
          >
            {t("aff.withdraw", { amount: (stats.pendingBalance || 0).toLocaleString() })}
          </button>
        )}

        {!stats.canRequestPayout && (stats.pendingBalance || 0) > 0 && (
          <div style={{ marginBottom: "24px", padding: "12px 16px", borderRadius: "8px", background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.2)", fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            💡 เบิกเงินได้เมื่อยอดสะสมถึง ฿{stats.minPayoutThb} (ปัจจุบัน ฿{(stats.pendingBalance || 0).toLocaleString()})
          </div>
        )}

        {payoutForm && (
          <div className="card" style={{ marginBottom: "24px" }}>
            <h3 style={{ marginBottom: "16px" }}>💸 ขอเบิกเงิน</h3>
            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">วิธีรับเงิน</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className={`btn ${payoutMethod === "promptpay" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setPayoutMethod("promptpay")}
                  style={{ flex: 1 }}
                >
                  PromptPay
                </button>
                <button
                  className={`btn ${payoutMethod === "bank_transfer" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setPayoutMethod("bank_transfer")}
                  style={{ flex: 1 }}
                >
                  โอนธนาคาร
                </button>
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">
                {payoutMethod === "promptpay" ? "เบอร์ PromptPay" : "ชื่อบัญชี + เลขบัญชี + ธนาคาร"}
              </label>
              <input
                value={accountInfo}
                onChange={(e) => setAccountInfo(e.target.value)}
                placeholder={payoutMethod === "promptpay" ? "0812345678" : "ชื่อ นามสกุล / 123-4-56789-0 / กสิกร"}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn btn-primary"
                onClick={handlePayout}
                disabled={payoutSubmitting}
                style={{ flex: 1 }}
              >
                {payoutSubmitting ? <><span className="spinner" /> กำลังส่ง...</> : `ยืนยันเบิก ฿${(stats.pendingBalance || 0).toLocaleString()}`}
              </button>
              <button className="btn btn-secondary" onClick={() => setPayoutForm(false)}>
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* Two columns: Commissions + Payouts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Commission History */}
          <div>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>💰 ค่าคอมมิชชั่น</h2>
            {!stats.recentCommissions?.length ? (
              <div className="card">
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "24px 0" }}>
                  ยังไม่มีค่าคอม — แชร์ลิงก์ให้เพื่อนเลย!
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>จำนวน</th>
                      <th>สถานะ</th>
                      <th>วันที่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentCommissions.map((c) => (
                      <tr key={c.id}>
                        <td style={{ color: "var(--success)", fontWeight: 600 }}>
                          ฿{c.amountThb.toLocaleString()}
                        </td>
                        <td>
                          <span className={`status-badge ${c.status === "paid" ? "done" : c.status === "pending" ? "processing" : ""}`}>
                            {c.status === "pending" ? "รอดำเนินการ" : c.status === "approved" ? "อนุมัติแล้ว" : c.status === "paid" ? "จ่ายแล้ว" : c.status}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                          {new Date(c.createdAt).toLocaleDateString("th-TH")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payout History */}
          <div>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>💸 ประวัติเบิกเงิน</h2>
            {!stats.payoutRequests?.length ? (
              <div className="card">
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "24px 0" }}>
                  ยังไม่มีการเบิกเงิน
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>จำนวน</th>
                      <th>วิธี</th>
                      <th>สถานะ</th>
                      <th>วันที่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.payoutRequests.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>฿{p.amountThb.toLocaleString()}</td>
                        <td style={{ fontSize: "0.85rem" }}>
                          {p.method === "promptpay" ? "PromptPay" : "โอนธนาคาร"}
                        </td>
                        <td>
                          <span className={`status-badge ${p.status === "paid" ? "done" : p.status === "rejected" ? "failed" : "processing"}`}>
                            {p.status === "pending" ? "รอ" : p.status === "approved" ? "อนุมัติ" : p.status === "paid" ? "จ่ายแล้ว" : "ปฏิเสธ"}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                          {new Date(p.createdAt).toLocaleDateString("th-TH")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
