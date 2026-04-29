import { redirect } from "next/navigation";
import { StudentShell } from "@/components/layouts/student-shell";
import { getSession } from "@/server/auth-session";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return <StudentShell user={session.user}>{children}</StudentShell>;
}
