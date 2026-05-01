"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useLocale } from "@/app/components/LocaleProvider";

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

type PaymentTab = "card" | "thai" | "crypto";

// ── Icon CDN ──
// Using cryptocurrency-icons CDN for coin logos
const COIN_ICON_CDN = "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color";

// Map NOWPayments IDs to the icon filename in the CDN
const ICON_MAP: Record<string, string> = {
  usdttrc20: "usdt", usdterc20: "usdt", usdtmatic: "usdt", usdtarb: "usdt",
  usdtop: "usdt", usdtbsc: "usdt", usdtsol: "usdt",
  usdc: "usdc", usdcmatic: "usdc", usdcarb: "usdc", usdcbase: "usdc",
  usdcop: "usdc", usdcbsc: "usdc", usdcsol: "usdc",
  dai: "dai",
  btc: "btc", eth: "eth", bnbbsc: "bnb", trx: "trx",
};

// Overrides for coins with incorrect/outdated icons in the generic CDN
const ICON_OVERRIDES: Record<string, string> = {
  sol: "https://assets.coingecko.com/coins/images/4128/standard/solana.png",
  doge: "https://assets.coingecko.com/coins/images/5/standard/dogecoin.png",
};

function coinIconUrl(coinId: string): string {
  if (ICON_OVERRIDES[coinId]) return ICON_OVERRIDES[coinId];
  const key = ICON_MAP[coinId] || "generic";
  return `${COIN_ICON_CDN}/${key}.svg`;
}

// Network badge colors
const NETWORK_COLORS: Record<string, string> = {
  "TRC-20": "#eb0029",
  "ERC-20": "#627eea",
  "Polygon": "#8247e5",
  "Arbitrum": "#28a0f0",
  "Optimism": "#ff0420",
  "Base": "#0052ff",
  "BSC": "#f0b90b",
  "BTC": "#f7931a",
  "ETH": "#627eea",
  "SOL": "#9945ff",
  "TRX": "#eb0029",
  "LTC": "#bfbbbb",
  "DOGE": "#c2a633",
};

const THAI_METHODS = [
  { id: "promptpay", name: "PromptPay QR", nameEN: "PromptPay", logo: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/PromptPay.png", color: "#003b71" },
  { id: "truemoney_jumpapp", name: "TrueMoney Wallet", nameEN: "TrueMoney", logo: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/TrueMoney.png", color: "#ef4123" },
  { id: "rabbit_linepay", name: "Rabbit LINE Pay", nameEN: "LINE Pay", logo: "https://scdn.line-apps.com/n/line_regulation/files/ver2/LINE_Icon.png", color: "#06c755" },
  { id: "mobile_banking_scb", name: "SCB Easy", nameEN: "SCB", logo: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/SCB.png", color: "#4e2a84" },
  { id: "mobile_banking_kbank", name: "K PLUS", nameEN: "KBank", logo: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/KBANK.png", color: "#138f2d" },
  { id: "mobile_banking_bbl", name: "Bangkok Bank", nameEN: "BBL", logo: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/BBL.png", color: "#1e3a8a" },
  { id: "mobile_banking_bay", name: "Krungsri (KMA)", nameEN: "BAY", logo: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/BAY.png", color: "#ffc107" },
  { id: "mobile_banking_ktb", name: "Krungthai NEXT", nameEN: "KTB", logo: "https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/icons/KTB.png", color: "#00a0e4" },
];

interface CryptoCoin {
  id: string;
  name: string;
  fullName: string;
  network: string;
  group: string;
}

const CRYPTO_COINS: CryptoCoin[] = [
  // Stablecoins
  { id: "usdttrc20", name: "USDT", fullName: "Tether", network: "TRC-20", group: "Stablecoins" },
  { id: "usdtmatic", name: "USDT", fullName: "Tether", network: "Polygon", group: "Stablecoins" },
  { id: "usdtarb", name: "USDT", fullName: "Tether", network: "Arbitrum", group: "Stablecoins" },
  { id: "usdtop", name: "USDT", fullName: "Tether", network: "Optimism", group: "Stablecoins" },
  { id: "usdtbsc", name: "USDT", fullName: "Tether", network: "BSC", group: "Stablecoins" },
  { id: "usdterc20", name: "USDT", fullName: "Tether", network: "ERC-20", group: "Stablecoins" },
  { id: "usdcbase", name: "USDC", fullName: "USD Coin", network: "Base", group: "Stablecoins" },
  { id: "usdcmatic", name: "USDC", fullName: "USD Coin", network: "Polygon", group: "Stablecoins" },
  { id: "usdcarb", name: "USDC", fullName: "USD Coin", network: "Arbitrum", group: "Stablecoins" },
  { id: "usdcop", name: "USDC", fullName: "USD Coin", network: "Optimism", group: "Stablecoins" },
  { id: "usdcbsc", name: "USDC", fullName: "USD Coin", network: "BSC", group: "Stablecoins" },
  { id: "usdc", name: "USDC", fullName: "USD Coin", network: "ERC-20", group: "Stablecoins" },
  { id: "usdtsol", name: "USDT", fullName: "Tether", network: "SOL", group: "Stablecoins" },
  { id: "usdcsol", name: "USDC", fullName: "USD Coin", network: "SOL", group: "Stablecoins" },
  { id: "dai", name: "DAI", fullName: "Dai", network: "ERC-20", group: "Stablecoins" },
  // Major
  { id: "btc", name: "BTC", fullName: "Bitcoin", network: "BTC", group: "Major" },
  { id: "eth", name: "ETH", fullName: "Ethereum", network: "ETH", group: "Major" },
  { id: "bnbbsc", name: "BNB", fullName: "BNB Chain", network: "BSC", group: "Major" },
  { id: "sol", name: "SOL", fullName: "Solana", network: "SOL", group: "Major" },
  { id: "trx", name: "TRX", fullName: "TRON", network: "TRX", group: "Major" },
  { id: "doge", name: "DOGE", fullName: "Dogecoin", network: "DOGE", group: "Major" },
];

const GROUPS = ["Stablecoins", "Major"];

// ── Crypto Dropdown Component ──
function CryptoSelector({
  selectedCoin,
  onSelect,
}: {
  selectedCoin: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = CRYPTO_COINS.find((c) => c.id === selectedCoin);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const filtered = search
    ? CRYPTO_COINS.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.fullName.toLowerCase().includes(search.toLowerCase()) ||
          c.network.toLowerCase().includes(search.toLowerCase())
      )
    : CRYPTO_COINS;

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 16px",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          cursor: "pointer",
          color: "var(--text-primary)",
          fontSize: "0.95rem",
          transition: "all 0.2s ease",
        }}
      >
        <Image
          src={coinIconUrl(selectedCoin)}
          alt={selected?.name || ""}
          width={28}
          height={28}
          style={{ borderRadius: "50%" }}
          unoptimized
        />
        <div style={{ flex: 1, textAlign: "left" }}>
          <span style={{ fontWeight: 600 }}>{selected?.name}</span>
          <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>{selected?.fullName}</span>
        </div>
        <NetworkBadge network={selected?.network || ""} />
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Modal Overlay */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
              setSearch("");
            }
          }}
        >
          <div
            ref={dropdownRef}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
              width: "100%",
              maxWidth: "440px",
              maxHeight: "520px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "fadeInScale 0.15s ease-out",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
            }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Select Cryptocurrency</h3>
              <button
                onClick={() => { setOpen(false); setSearch(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  padding: "4px",
                  lineHeight: 1,
                }}
              >✕</button>
            </div>

            {/* Search */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--bg-secondary)",
                borderRadius: "10px",
                padding: "10px 14px",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search coin or network..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--text-primary)",
                    fontSize: "0.95rem",
                    width: "100%",
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, fontSize: "0.9rem" }}
                  >✕</button>
                )}
              </div>
            </div>

            {/* Coin List */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {GROUPS.map((group) => {
                const coins = filtered.filter((c) => c.group === group);
                if (!coins.length) return null;
                return (
                  <div key={group}>
                    <div style={{
                      padding: "10px 20px 4px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      color: "var(--text-muted)",
                      opacity: 0.6,
                      position: "sticky",
                      top: 0,
                      background: "var(--bg-card)",
                    }}>
                      {group}
                    </div>
                    {coins.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelect(c.id);
                          setOpen(false);
                          setSearch("");
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "10px 20px",
                          border: "none",
                          background: selectedCoin === c.id ? "rgba(249, 115, 22, 0.12)" : "transparent",
                          cursor: "pointer",
                          color: "var(--text-primary)",
                          fontSize: "0.9rem",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedCoin !== c.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = selectedCoin === c.id ? "rgba(249, 115, 22, 0.12)" : "transparent";
                        }}
                      >
                        <Image
                          src={coinIconUrl(c.id)}
                          alt={c.name}
                          width={32}
                          height={32}
                          style={{ borderRadius: "50%", flexShrink: 0 }}
                          unoptimized
                        />
                        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                          <div style={{ fontWeight: 600, lineHeight: 1.3 }}>
                            {c.name}
                            <NetworkBadge network={c.network} />
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            {c.fullName}
                          </div>
                        </div>
                        {selectedCoin === c.id && (
                          <svg width="18" height="18" viewBox="0 0 16 16" fill="var(--accent)" style={{ flexShrink: 0 }}>
                            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                  No coins found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Network Badge ──
function NetworkBadge({ network }: { network: string }) {
  const color = NETWORK_COLORS[network] || "#888";
  return (
    <span style={{
      display: "inline-block",
      fontSize: "0.65rem",
      fontWeight: 700,
      padding: "2px 6px",
      borderRadius: "4px",
      background: color,
      color: "#fff",
      marginLeft: "6px",
      verticalAlign: "middle",
      letterSpacing: "0.3px",
    }}>
      {network}
    </span>
  );
}

// ── Thai Payment Selector Component ──
function ThaiPaymentSelector({
  selectedMethod,
  onSelect,
}: {
  selectedMethod: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = THAI_METHODS.find((m) => m.id === selectedMethod);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 16px",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          cursor: "pointer",
          color: "var(--text-primary)",
          fontSize: "0.95rem",
          transition: "all 0.2s ease",
        }}
      >
        <Image
          src={selected?.logo || ""}
          alt={selected?.name || ""}
          width={28}
          height={28}
          style={{ borderRadius: "6px", objectFit: "contain" }}
          unoptimized
        />
        <div style={{ flex: 1, textAlign: "left" }}>
          <span style={{ fontWeight: 600 }}>{selected?.name}</span>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            width: "100%",
            maxWidth: "440px",
            overflow: "hidden",
            animation: "fadeInScale 0.15s ease-out",
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
            }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Select Payment Method</h3>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none", border: "none",
                  color: "var(--text-muted)", cursor: "pointer",
                  fontSize: "1.2rem", padding: "4px", lineHeight: 1,
                }}
              >✕</button>
            </div>

            {/* Method List */}
            <div style={{ padding: "8px 0" }}>
              {THAI_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { onSelect(m.id); setOpen(false); }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "12px 20px",
                    border: "none",
                    background: selectedMethod === m.id ? "rgba(249, 115, 22, 0.12)" : "transparent",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                    fontSize: "0.95rem",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedMethod !== m.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = selectedMethod === m.id ? "rgba(249, 115, 22, 0.12)" : "transparent";
                  }}
                >
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: "8px",
                    overflow: "hidden",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#fff",
                  }}>
                    <Image
                      src={m.logo}
                      alt={m.name}
                      width={32}
                      height={32}
                      style={{ objectFit: "contain" }}
                      unoptimized
                    />
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{m.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{m.nameEN}</div>
                  </div>
                  {selectedMethod === m.id && (
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="var(--accent)" style={{ flexShrink: 0 }}>
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Main Page ──
export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [currency, setCurrency] = useState("thb");
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<PaymentTab>("card");
  const [selectedThaiMethod, setSelectedThaiMethod] = useState("promptpay");
  const [selectedCoin, setSelectedCoin] = useState("usdttrc20");
  const { t, isThai, locale } = useLocale();

  useEffect(() => {
    setFetching(true);
    fetch(`/api/pricing?locale=${locale}`)
      .then((r) => r.json())
      .then((data) => {
        setPackages(data.packages);
        setCurrency(data.currency);
        if (isThai) {
          // Thai users: default to Thai Banking tab
          setActiveTab("thai");
        } else {
          // Non-Thai: if currently on "thai" tab, switch to "card"
          setActiveTab((prev) => prev === "thai" ? "card" : prev);
        }
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, [locale]);

  const handlePurchase = async (packageId: string) => {
    setLoading(packageId);
    try {
      let endpoint = "";
      let body: Record<string, string> = {};

      if (activeTab === "card") {
        endpoint = "/api/stripe/checkout";
        body = { packageId, currency };
      } else if (activeTab === "thai") {
        endpoint = "/api/omise/checkout";
        body = { packageId, paymentMethod: selectedThaiMethod };
      } else {
        endpoint = "/api/crypto/checkout";
        body = { packageId, coin: selectedCoin };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.error === "Unauthorized") {
        window.location.href = "/login";
        return;
      }

      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }

      if (data.url) { window.location.href = data.url; return; }
      if (data.authorizeUri) { window.location.href = data.authorizeUri; return; }
      if (data.invoiceUrl) { window.location.href = data.invoiceUrl; return; }

      alert("Something went wrong");
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setLoading(null);
    }
  };

  const tabStyle = (tab: PaymentTab): React.CSSProperties => ({
    padding: "10px 16px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: activeTab === tab ? 700 : 500,
    background: activeTab === tab ? "var(--accent)" : "var(--bg-card)",
    color: activeTab === tab ? "#fff" : "var(--text-secondary)",
    transition: "all 0.2s ease",
    flex: 1,
    whiteSpace: "nowrap",
  });

  const selectedCoinData = CRYPTO_COINS.find((c) => c.id === selectedCoin);

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1 className="pricing-title">
            {t("price.title")}
          </h1>
        </div>

        {/* Payment Method Tabs */}
        <div style={{
          display: "flex",
          gap: "6px",
          justifyContent: "center",
          maxWidth: "500px",
          margin: "0 auto 16px",
          padding: "0 8px",
        }}>
          <button style={tabStyle("card")} onClick={() => setActiveTab("card")}>
            {t("price.tab.card")}
          </button>
          {isThai && (
            <button style={tabStyle("thai")} onClick={() => setActiveTab("thai")}>
              {t("price.tab.thai")}
            </button>
          )}
          <button style={tabStyle("crypto")} onClick={() => setActiveTab("crypto")}>
            {t("price.tab.crypto")}
          </button>
        </div>

        {/* Payment method description */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          {activeTab === "card" && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {t("price.card.desc")}
              {currency !== "thb" && (
                <span style={{ color: "var(--warning)" }}> · {t("price.intlFee", { pct: 5 })}</span>
              )}
            </p>
          )}
          {activeTab === "thai" && (
            <>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "16px" }}>
                {t("price.selectMethod")}
              </p>
              <ThaiPaymentSelector
                selectedMethod={selectedThaiMethod}
                onSelect={setSelectedThaiMethod}
              />
            </>
          )}
          {activeTab === "crypto" && (
            <>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "16px" }}>
                {t("price.selectCrypto")}
              </p>
              <CryptoSelector
                selectedCoin={selectedCoin}
                onSelect={setSelectedCoin}
              />
            </>
          )}
        </div>

        {/* Package Cards */}
        {fetching ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <span className="spinner spinner-lg" style={{ margin: "0 auto" }} />
          </div>
        ) : (
          <>
            <div
              className="pricing-grid"
              ref={(el) => {
                if (!el) return;
                // Auto-scroll to Pro (popular) card on mobile
                const popularIdx = packages.findIndex(p => p.popular);
                if (popularIdx > 0 && window.innerWidth <= 800) {
                  const card = el.children[popularIdx] as HTMLElement;
                  if (card) {
                    setTimeout(() => {
                      card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                    }, 100);
                  }
                }
                // Track active dot via IntersectionObserver
                const observer = new IntersectionObserver(
                  (entries) => {
                    entries.forEach((entry) => {
                      if (entry.isIntersecting) {
                        const idx = Array.from(el.children).indexOf(entry.target as Element);
                        document.querySelectorAll(".carousel-dot").forEach((dot, i) => {
                          dot.classList.toggle("active", i === idx);
                        });
                      }
                    });
                  },
                  { root: el, threshold: 0.6 }
                );
                Array.from(el.children).forEach((child) => observer.observe(child));
              }}
            >
              {packages.map((pkg) => (
                <div key={pkg.id} className={`pricing-card ${pkg.popular ? "popular" : ""}`}>
                  {pkg.popular && <div className="popular-badge">{t("price.popular")}</div>}

                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700 }}>{pkg.name}</h3>
                  <div className="credits-amount">
                    {pkg.credits.toLocaleString()} credits
                  </div>
                  <div className="price">
                    {activeTab === "crypto" ? (
                      <>
                        <span className="currency">$</span>
                        {pkg.cryptoPriceUsd}
                      </>
                    ) : (
                      <>
                        <span className="currency">{pkg.symbol}</span>
                        {pkg.displayPrice}
                      </>
                    )}
                  </div>
                  <div className="description">
                    {pkg.description}
                    {activeTab === "card" && pkg.surchargePercent > 0 && (
                      <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        incl. {pkg.surchargePercent}% intl fee
                      </span>
                    )}
                    {activeTab === "thai" && (() => {
                      const m = THAI_METHODS.find(x => x.id === selectedThaiMethod);
                      return m ? (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "0.8rem", color: "var(--accent-light)", marginTop: "4px" }}>
                          <Image src={m.logo} alt="" width={16} height={16} style={{ borderRadius: "3px", objectFit: "contain" }} unoptimized />
                          {m.name}
                        </span>
                      ) : null;
                    })()}
                    {activeTab === "crypto" && selectedCoinData && (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "0.8rem", color: "var(--accent-light)", marginTop: "4px" }}>
                        <Image src={coinIconUrl(selectedCoin)} alt="" width={16} height={16} style={{ borderRadius: "50%" }} unoptimized />
                        {selectedCoinData.name}
                        <NetworkBadge network={selectedCoinData.network} />
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
                      <><span className="spinner" /> {t("price.processing")}</>
                    ) : (
                      t("price.buyNow")
                    )}
                  </button>
                </div>
              ))}
            </div>
            {/* Carousel Dots */}
            <div className="carousel-dots">
              {packages.map((pkg, i) => (
                <button
                  key={pkg.id}
                  className={`carousel-dot ${pkg.popular ? "active" : ""}`}
                  onClick={() => {
                    const grid = document.querySelector(".pricing-grid");
                    const card = grid?.children[i] as HTMLElement;
                    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "48px", color: "var(--text-muted)" }}>
          <p style={{ marginBottom: "16px" }}>
            <strong style={{ color: "var(--accent-light)" }}>{t("price.bonus")}</strong>
          </p>
          <p style={{ fontSize: "0.85rem" }}>
            {t("price.neverExpire")}
          </p>
          <p style={{ fontSize: "0.8rem", marginTop: "12px", color: "var(--text-muted)", opacity: 0.6 }}>
            {t("price.poweredBy")}
          </p>
        </div>
      </div>
    </div>
  );
}
