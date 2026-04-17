import Link from "next/link";

export default function HomePage() {
  return (
    <div className="page">
      {/* Hero */}
      <div className="container" style={{ textAlign: "center", paddingTop: "40px", paddingBottom: "80px" }}>
        <div style={{
          display: "inline-block",
          padding: "6px 16px",
          borderRadius: "99px",
          background: "rgba(124, 58, 237, 0.15)",
          border: "1px solid rgba(167, 139, 250, 0.3)",
          fontSize: "0.85rem",
          color: "var(--accent-light)",
          fontWeight: 600,
          marginBottom: "24px",
          letterSpacing: "0.3px",
        }}>
          ⚡ Powered by WhisperX AI
        </div>

        <h1 style={{
          fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: "-1px",
          marginBottom: "20px",
          background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          แปลงเสียงเป็นซับไทเทิล<br />
          <span style={{
            background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            ด้วย AI ในไม่กี่วินาที
          </span>
        </h1>

        <p style={{
          fontSize: "1.15rem",
          color: "var(--text-secondary)",
          maxWidth: "560px",
          margin: "0 auto 40px",
          lineHeight: 1.7,
        }}>
          อัพโหลดไฟล์เสียงหรือวิดีโอ — รับ transcript JSON, SRT, TXT
          และ ซับ .ASS สไตล์ TikTok พร้อมใช้ทันที
        </p>

        <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/transcribe" className="btn btn-primary btn-lg">
            🚀 เริ่ม Transcribe ฟรี
          </Link>
          <Link href="/pricing" className="btn btn-secondary btn-lg">
            💎 ดูราคา
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container" style={{ paddingBottom: "80px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
        }}>
          {[
            {
              icon: "🎤",
              title: "Transcribe ถูกต้องสูง",
              desc: "ใช้ WhisperX ร่วมกับ word-level timestamps สำหรับการ align ที่แม่นยำ",
            },
            {
              icon: "🎬",
              title: "ซับ ASS สไตล์ TikTok",
              desc: "สร้างซับไทเทิลแบบ word-by-word หรือ pause-split ทั้งแนวตั้งและแนวนอน",
            },
            {
              icon: "🌐",
              title: "รองรับ 15+ ภาษา",
              desc: "ไทย, อังกฤษ, จีน, ญี่ปุ่น, เกาหลี และอีกมาก พร้อม Auto-detect",
            },
            {
              icon: "⚡",
              title: "เร็ว คิดตามจริง",
              desc: "ไม่มีค่าสมัครรายเดือน — ซื้อ credits ใช้ตามจำนวนนาทีจริง",
            },
            {
              icon: "🔗",
              title: "Align Mode",
              desc: "มีบทพูดอยู่แล้ว? ให้ AI จับ timestamp ให้ตรงกับเสียงโดยไม่ผิดคำ",
            },
            {
              icon: "💾",
              title: "Export หลายรูปแบบ",
              desc: "ดาวน์โหลดเป็น JSON, SRT, TXT หรือ ASS — ทุกงานเก็บใน Dashboard",
            },
          ].map((f) => (
            <div key={f.title} className="card" style={{ padding: "28px" }}>
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>{f.icon}</div>
              <h3 style={{ marginBottom: "8px" }}>{f.title}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Banner */}
      <div className="container" style={{ paddingBottom: "60px" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.2))",
          border: "1px solid rgba(167,139,250,0.2)",
          borderRadius: "20px",
          padding: "48px 32px",
          textAlign: "center",
        }}>
          <h2 style={{ fontSize: "1.8rem", marginBottom: "12px" }}>
            สมัครใหม่รับ <span style={{ color: "var(--accent-light)" }}>5,000 credits ฟรี!</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "28px" }}>
            ≈ 25 นาที — ไม่ต้องใส่บัตรเครดิต
          </p>
          <Link href="/login" className="btn btn-primary btn-lg">
            เริ่มใช้งานฟรี →
          </Link>
        </div>
      </div>
    </div>
  );
}
