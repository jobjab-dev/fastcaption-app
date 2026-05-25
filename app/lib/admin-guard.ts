import { getAuthUser } from "./auth-helpers";

/**
 * Admin email whitelist — comma-separated in ADMIN_EMAILS env var.
 * Falls back to a hardcoded list if not set.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Check if the current authenticated user is an admin.
 * Returns the user object if admin, null otherwise.
 */
export async function requireAdmin() {
  const user = await getAuthUser();
  if (!user) return null;

  const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
  if (!isAdmin) return null;

  return user;
}
