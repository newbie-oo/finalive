import { StudentShell } from "@/components/layouts/student-shell";
import { requireSession } from "@/server/auth-session";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSession("/login");
  return <StudentShell user={user}>{children}</StudentShell>;
}
