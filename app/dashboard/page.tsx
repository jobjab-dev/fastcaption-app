import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/db";
import { getUserCredits, creditsToMinutes } from "@/app/lib/credits";
import Link from "next/link";
import JobActions from "./JobActions";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [credits, recentJobs, recentTransactions] = await Promise.all([
    getUserCredits(session.user.id),
    prisma.job.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const totalJobs = await prisma.job.count({ where: { userId: session.user.id } });
  const totalCreditsUsed = await prisma.transaction.aggregate({
    where: { userId: session.user.id, type: "usage" },
    _sum: { credits: true },
  });

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ marginBottom: "8px" }}>สวัสดี, {session.user.name || "User"} 👋</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "32px" }}>
          Dashboard ของคุณ
        </p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Credits คงเหลือ</div>
            <div className="stat-value accent">{credits.toLocaleString()}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              ≈ {creditsToMinutes(credits)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">งานทั้งหมด</div>
            <div className="stat-value">{totalJobs}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Credits ที่ใช้ไป</div>
            <div className="stat-value">{Math.abs(totalCreditsUsed._sum.credits || 0).toLocaleString()}</div>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Link href="/transcribe" className="btn btn-primary" style={{ width: "100%" }}>
              🎵 Transcribe ไฟล์ใหม่
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>📋 งานล่าสุด</h2>
            {recentJobs.length === 0 ? (
              <div className="card">
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "32px 0" }}>
                  ยังไม่มีงาน — <Link href="/transcribe">เริ่ม transcribe</Link>
                </p>
              </div>
            ) : (
              recentJobs.map((job) => (
                <div key={job.id} className="job-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="job-info">
                      <div className="job-name">{job.fileName}</div>
                      <div className="job-meta">
                        {Math.round(job.durationSec)}s · {job.creditsUsed} credits · {new Date(job.createdAt).toLocaleDateString("th-TH")}
                      </div>
                    </div>
                    <span className={`status-badge ${job.status}`}>
                      {job.status === "done" ? "✓ สำเร็จ" :
                        job.status === "processing" ? "⏳ กำลังทำ" :
                          job.status === "failed" ? "✗ ล้มเหลว" :
                            "รอคิว"}
                    </span>
                  </div>
                  <JobActions jobId={job.id} fileName={job.fileName} status={job.status} />
                </div>
              ))
            )}
          </div>

          <div>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>💰 ธุรกรรมล่าสุด</h2>
            {recentTransactions.length === 0 ? (
              <div className="card">
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "32px 0" }}>
                  ยังไม่มีธุรกรรม
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>รายการ</th>
                      <th>Credits</th>
                      <th>วันที่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{tx.description}</td>
                        <td style={{ color: tx.credits > 0 ? "var(--success)" : "var(--error)", fontWeight: 600 }}>
                          {tx.credits > 0 ? "+" : ""}{tx.credits.toLocaleString()}
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                          {new Date(tx.createdAt).toLocaleDateString("th-TH")}
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
