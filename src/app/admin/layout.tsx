import { AdminShell } from "@/components/layouts/admin-shell";
import { requireRole } from "@/server/auth-session";
import { countPendingSlipsByStatus } from "@/server/repos/slip";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireRole("admin");
  // Surface the pending-slip count as a sidebar badge so admins always see
  // the queue depth without clicking into /admin/slips.
  const counts = await countPendingSlipsByStatus();
  const pendingSlipCount = counts.submitted ?? 0;
  return (
    <AdminShell user={user} pendingSlipCount={pendingSlipCount}>
      {children}
    </AdminShell>
  );
}
