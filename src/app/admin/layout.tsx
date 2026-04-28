import { AdminShell } from "@/components/layouts/admin-shell";
import { requireRole } from "@/server/auth-session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireRole("admin");
  return <AdminShell user={user}>{children}</AdminShell>;
}
