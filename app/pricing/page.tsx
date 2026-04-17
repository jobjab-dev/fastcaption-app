"use client";

import { useState, useEffect } from "react";

interface PricingPackage {
  id: string;
  name: string;
  credits: number;
  description: string;
  popular: boolean;
  currency: string;
  symbol: string;
  displayPrice: string;
  surchargePercent: number;
  isTHB: boolean;
}

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [currency, setCurrency] = useState("thb");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((data) => {
        setPackages(data.packages);
        setCurrency(data.currency);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, []);

  const handlePurchase = async (packageId: string) => {
    setLoading(packageId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, currency }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === "Unauthorized") {
        window.location.href = "/login";
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "12px" }}>
            💎 เติม Credits
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>
            1,000 credits = 5 นาที — คิดตามวินาทีละเอียด
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "8px" }}>
            รองรับบัตรเครดิต{currency === "thb" ? " / PromptPay QR" : ""} ผ่าน Stripe
            {currency !== "thb" && (
              <span style={{ color: "var(--warning)" }}> · +5% international fee</span>
            )}
          </p>
        </div>

        {fetching ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <span className="spinner spinner-lg" style={{ margin: "0 auto" }} />
          </div>
        ) : (
          <div className="pricing-grid">
            {packages.map((pkg) => (
              <div key={pkg.id} className={`pricing-card ${pkg.popular ? "popular" : ""}`}>
                {pkg.popular && <div className="popular-badge">แนะนำ</div>}

                <h3 style={{ fontSize: "1.3rem", fontWeight: 700 }}>{pkg.name}</h3>
                <div className="credits-amount">
                  {pkg.credits.toLocaleString()} credits
                </div>
                <div className="price">
                  <span className="currency">{pkg.symbol}</span>
                  {pkg.displayPrice}
                </div>
                <div className="description">
                  {pkg.description}
                  {pkg.surchargePercent > 0 && (
                    <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      incl. {pkg.surchargePercent}% intl fee
                    </span>
                  )}
                </div>

                <button
                  className={`btn ${pkg.popular ? "btn-primary" : "btn-secondary"}`}
                  style={{ width: "100%" }}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={loading !== null}
                >
                  {loading === pkg.id ? (
                    <><span className="spinner" /> Stripe...</>
                  ) : (
                    "ซื้อเลย"
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "48px", color: "var(--text-muted)" }}>
          <p style={{ marginBottom: "16px" }}>
            <strong style={{ color: "var(--accent-light)" }}>สมัครใหม่ได้รับ 5,000 credits ฟรี!</strong>
          </p>
          <p style={{ fontSize: "0.85rem" }}>
            Credits ไม่มีวันหมดอายุ · ไม่มีค่าสมัครรายเดือน · คิดตามการใช้จริง
          </p>
        </div>
      </div>
    </div>
  );
}
