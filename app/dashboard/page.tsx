import { getAuthUser, ensureUserExists } from "@/app/lib/auth-helpers";
import { getSupabaseUser } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/db";
import { getUserCredits, creditsToMinutes } from "@/app/lib/credits";
import Link from "next/link";
import JobActions from "./JobActions";
import TruncatedText from "@/app/components/TruncatedText";
import { headers, cookies } from "next/headers";
import { createT, type Locale } from "@/app/lib/i18n";

export default async function DashboardPage() {
  // Step 1: Check Supabase session — no session = truly not logged in
  const supabaseUser = await getSupabaseUser();
  if (!supabaseUser) redirect("/login");

  // Step 2: Get DB user — if missing, create it (handles first login race condition)
  let user = await getAuthUser();
  if (!user) {
    user = await ensureUserExists();
  }
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

  // Run ALL DB queries in parallel for speed
  const [credits, recentJobs, recentTransactions, totalJobs, totalCreditsUsedResult] = await Promise.all([
    getUserCredits(user.id),
    prisma.job.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, credits: true, description: true, createdAt: true },
    }).catch(() =>
      // gateway column may not exist yet — fall back to raw query
      prisma.$queryRawUnsafe<{ id: string; type: string; credits: number; description: string; createdAt: Date }[]>(
        `SELECT id, type, credits, description, "createdAt" FROM "Transaction" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 10`,
        user.id
      ).catch(() => [] as { id: string; type: string; credits: number; description: string; createdAt: Date }[])
    ),
    prisma.job.count({ where: { userId: user.id } }),
    prisma.transaction.aggregate({
      where: { userId: user.id, type: "usage" },
      _sum: { credits: true },
    }).catch(() => ({ _sum: { credits: 0 } })),
  ]);

  const totalCreditsUsed = Math.abs(totalCreditsUsedResult._sum.credits || 0);

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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div className="job-info">
                      <TruncatedText text={job.fileName} className="job-name" />
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
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="card" style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <TruncatedText
                        text={tx.description}
                        style={{ flex: 1, minWidth: 0, fontSize: "0.9rem" }}
                      />
                      <span style={{
                        color: tx.credits > 0 ? "var(--success)" : "var(--error)",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}>
                        {tx.credits > 0 ? "+" : ""}{tx.credits.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      {new Date(tx.createdAt).toLocaleDateString(dateLocale)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
