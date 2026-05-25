"use client";

import { useState, useCallback } from "react";

interface UserResult {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  createdAt: string;
  _count: { jobs: number };
}

interface GrantResult {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string | null;
    previousBalance: number;
    newBalance: number;
    creditsAdded: number;
  };
}

export default function AdminPanel() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [credits, setCredits] = useState("");
  const [reason, setReason] = useState("");
  const [granting, setGranting] = useState(false);
  const [result, setResult] = useState<GrantResult | null>(null);
  const [error, setError] = useState("");

  const searchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError("ค้นหาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const grantCredits = async () => {
    if (!selectedUser || !credits) return;
    const amount = parseInt(credits);
    if (isNaN(amount) || amount <= 0) {
      setError("กรุณาใส่จำนวนเครดิตที่ถูกต้อง");
      return;
    }

    setGranting(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          credits: amount,
          reason: reason || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to grant credits");
      }
      const data: GrantResult = await res.json();
      setResult(data);

      // Update the user in the list
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, credits: data.user.newBalance }
            : u
        )
      );
      setSelectedUser((prev) =>
        prev ? { ...prev, credits: data.user.newBalance } : null
      );
      setCredits("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setGranting(false);
    }
  };

  // Quick-add presets
  const presets = [
    { label: "1,000", value: 1000 },
    { label: "5,000", value: 5000 },
    { label: "10,000", value: 10000 },
    { label: "50,000", value: 50000 },
    { label: "100,000", value: 100000 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── Search Section ── */}
      <div className="card" style={{ padding: "28px" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          🔍 ค้นหาผู้ใช้
        </h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            id="admin-search-input"
            className="input"
            type="text"
            placeholder="ค้นหาด้วย email หรือชื่อ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchUsers()}
            style={{ flex: 1 }}
          />
          <button
            id="admin-search-btn"
            className="btn btn-primary"
            onClick={searchUsers}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              "ค้นหา"
            )}
          </button>
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "8px" }}>
          เว้นว่างเพื่อดูผู้ใช้ทั้งหมด (50 คนล่าสุด)
        </p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="alert alert-error" style={{ animation: "fadeInUp 0.3s ease" }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Success Result ── */}
      {result && (
        <div className="alert alert-success" style={{ animation: "fadeInUp 0.3s ease" }}>
          <strong>✅ เพิ่มเครดิตสำเร็จ!</strong>
          <div style={{ marginTop: "6px", fontSize: "0.88rem" }}>
            <strong>{result.user.email}</strong> · 
            {result.user.previousBalance.toLocaleString()} → <strong>{result.user.newBalance.toLocaleString()}</strong> credits
            (+{result.user.creditsAdded.toLocaleString()})
          </div>
        </div>
      )}

      {/* ── Users List ── */}
      {users.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <h3 style={{ fontSize: "0.95rem", margin: 0 }}>
              ผู้ใช้ ({users.length})
            </h3>
          </div>

          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {users.map((user) => (
              <div
                key={user.id}
                id={`admin-user-${user.id}`}
                onClick={() => {
                  setSelectedUser(user);
                  setResult(null);
                  setError("");
                }}
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: selectedUser?.id === user.id
                    ? "rgba(249, 115, 22, 0.08)"
                    : "transparent",
                  borderLeft: selectedUser?.id === user.id
                    ? "3px solid var(--accent)"
                    : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (selectedUser?.id !== user.id) {
                    e.currentTarget.style.background = "var(--surface-2)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedUser?.id !== user.id) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.92rem", marginBottom: "2px" }}>
                      {user.name || "—"}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.email}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: "1.05rem",
                      background: "linear-gradient(135deg, var(--accent-light), var(--accent-2))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}>
                      {user.credits.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {user._count.jobs} jobs · {new Date(user.createdAt).toLocaleDateString("th-TH")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Grant Credits Panel ── */}
      {selectedUser && (
        <div
          className="card"
          style={{
            padding: "28px",
            border: "1px solid rgba(249, 115, 22, 0.25)",
            animation: "fadeInUp 0.3s ease",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            🎁 เพิ่มเครดิตให้
          </h2>

          {/* Selected user info */}
          <div style={{
            background: "var(--surface-2)",
            borderRadius: "var(--radius)",
            padding: "14px 18px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontWeight: 700 }}>{selectedUser.name || "—"}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{selectedUser.email}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                ยอดปัจจุบัน
              </div>
              <div style={{ fontWeight: 800, fontSize: "1.3rem", color: "var(--accent-light)" }}>
                {selectedUser.credits.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Preset buttons */}
          <div style={{ marginBottom: "16px" }}>
            <label className="form-label">Quick Add</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {presets.map((p) => (
                <button
                  key={p.value}
                  className="btn btn-secondary"
                  style={{
                    fontSize: "0.82rem",
                    padding: "6px 14px",
                    borderColor: credits === String(p.value)
                      ? "var(--accent)"
                      : undefined,
                  }}
                  onClick={() => setCredits(String(p.value))}
                >
                  +{p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Credits input */}
          <div style={{ marginBottom: "14px" }}>
            <label className="form-label" htmlFor="admin-credits-input">จำนวนเครดิต</label>
            <input
              id="admin-credits-input"
              className="input"
              type="number"
              min="1"
              placeholder="เช่น 5000"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
          </div>

          {/* Reason input */}
          <div style={{ marginBottom: "20px" }}>
            <label className="form-label" htmlFor="admin-reason-input">เหตุผล (ไม่บังคับ)</label>
            <input
              id="admin-reason-input"
              className="input"
              type="text"
              placeholder="เช่น ชดเชยปัญหาระบบ, โปรโมชั่น..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && grantCredits()}
            />
          </div>

          {/* Submit */}
          <button
            id="admin-grant-btn"
            className="btn btn-primary btn-lg"
            style={{ width: "100%" }}
            onClick={grantCredits}
            disabled={granting || !credits}
          >
            {granting ? (
              <>
                <span className="spinner" /> กำลังเพิ่ม...
              </>
            ) : (
              <>
                ✨ เพิ่ม {credits ? `${parseInt(credits).toLocaleString()} เครดิต` : "เครดิต"}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
