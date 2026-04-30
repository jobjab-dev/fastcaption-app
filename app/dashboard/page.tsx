import { getAuthUser } from "@/app/lib/auth-helpers";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/db";
import { getUserCredits, creditsToMinutes } from "@/app/lib/credits";
import Link from "next/link";
import JobActions from "./JobActions";
import { headers, cookies } from "next/headers";
import { createT, type Locale } from "@/app/lib/i18n";

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  // Detect locale from cookie or Accept-Language header
  const cookieStore = await cookies();
  const headerStore = await headers();
  const savedLocale = cookieStore.get("fastcaption-locale")?.value;
  const acceptLang = headerStore.get("accept-language") || "";
  const locale: Locale = savedLocale === "th" || savedLocale === "en"
    ? savedLocale
    : acceptLang.includes("th") ? "th" : "en";
  const t = createT(locale);
  const dateLocale = locale === "th" ? "th-TH" : "en-US";

  const [credits, recentJobs] = await Promise.all([
    getUserCredits(user.id),
    prisma.job.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Fetch transactions — handle gracefully if gateway column doesn't exist yet
  let recentTransactions: { id: string; type: string; credits: number; description: string; createdAt: Date }[] = [];
  try {
    recentTransactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, credits: true, description: true, createdAt: true },
    });
  } catch {
    // gateway column may not exist yet — fall back to raw query
    try {
      recentTransactions = await prisma.$queryRawUnsafe(
        `SELECT id, type, credits, description, "createdAt" FROM "Transaction" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 10`,
        user.id
      );
    } catch {
      recentTransactions = [];
    }
  }

  const totalJobs = await prisma.job.count({ where: { userId: user.id } });
  let totalCreditsUsed = 0;
  try {
    const agg = await prisma.transaction.aggregate({
      where: { userId: user.id, type: "usage" },
      _sum: { credits: true },
    });
    totalCreditsUsed = Math.abs(agg._sum.credits || 0);
  } catch {
    totalCreditsUsed = 0;
  }

  // Format credits to minutes
  const creditsMin = creditsToMinutes(credits);

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ marginBottom: "8px" }}>{t("dash.greeting", { name: user.name || "User" })}</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "32px" }}>
          {t("dash.subtitle")}
        </p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">{t("dash.credits")}</div>
            <div className="stat-value accent">{credits.toLocaleString()}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              ≈ {creditsMin}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t("dash.totalJobs")}</div>
            <div className="stat-value">{totalJobs}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t("dash.creditsUsed")}</div>
            <div className="stat-value">{totalCreditsUsed.toLocaleString()}</div>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Link href="/transcribe" className="btn btn-primary" style={{ width: "100%" }}>
              {t("dash.newTranscribe")}
            </Link>
          </div>
        </div>

        <div className="dashboard-panels">
          <div>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>{t("dash.recentJobs")}</h2>
            {recentJobs.length === 0 ? (
              <div className="card">
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "32px 0" }}>
                  {t("dash.noJobs")}<Link href="/transcribe">{t("dash.startTranscribe")}</Link>
                </p>
              </div>
            ) : (
              recentJobs.map((job) => (
                <div key={job.id} className="job-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="job-info">
                      <div className="job-name">{job.fileName}</div>
                      <div className="job-meta">
                        {Math.round(job.durationSec)}s · {job.creditsUsed} credits · {new Date(job.createdAt).toLocaleDateString(dateLocale)}
                      </div>
                    </div>
                    <span className={`status-badge ${job.status}`}>
                      {job.status === "done" ? t("dash.done") :
                        job.status === "processing" ? t("dash.processing") :
                          job.status === "failed" ? t("dash.failed") :
                            t("dash.queued")}
                    </span>
                  </div>
                  <JobActions jobId={job.id} fileName={job.fileName} status={job.status} />
                </div>
              ))
            )}
          </div>

          <div>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>{t("dash.recentTx")}</h2>
            {recentTransactions.length === 0 ? (
              <div className="card">
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "32px 0" }}>
                  {t("dash.noTx")}
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>{t("dash.colDesc")}</th>
                      <th>{t("dash.colCredits")}</th>
                      <th>{t("dash.colDate")}</th>
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
                          {new Date(tx.createdAt).toLocaleDateString(dateLocale)}
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
