import { requireAdmin } from "@/app/lib/admin-guard";
import { redirect } from "next/navigation";
import AdminPanel from "./AdminPanel";

export const metadata = {
  title: "Admin — FastCaption",
  robots: "noindex, nofollow",
};

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ marginBottom: "4px" }}>🛡️ Admin Panel</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            จัดการเครดิตผู้ใช้ · Logged in as <strong>{admin.email}</strong>
          </p>
        </div>
        <AdminPanel />
      </div>
    </div>
  );
}
