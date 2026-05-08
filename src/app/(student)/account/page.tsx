import { redirect } from "next/navigation";
import { getSession } from "@/server/auth-session";
import { hasCredentialAccount } from "@/server/repos/auth-account";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { AccountPanels } from "./account-panels";

export const dynamic = "force-dynamic";

/**
 * Server Component. Resolves the session and credential-account flag on the
 * server so the page renders with the correct name/email/avatar in the
 * initial HTML — no useSession() flash on mount, no separate
 * userHasCredentialAccount() round-trip after hydration.
 */
export default async function AccountPage() {
	const session = await getSession();
	if (!session) redirect("/login");

	const hasCredential = await hasCredentialAccount(session.user.id);
	const { name, email } = session.user;

	return (
		<section className="mx-auto max-w-3xl space-y-8">
			<header className="flex items-center gap-4">
				<AvatarInitials name={name} size="xl" />
				<div>
					<h1 className="text-h1">บัญชีของฉัน</h1>
					<p className="mt-1 text-bodylg text-muted-foreground">
						ภาพรวมและการตั้งค่าบัญชีของคุณ
					</p>
				</div>
			</header>

			<AccountPanels
				initialName={name}
				email={email}
				hasCredential={hasCredential}
			/>
		</section>
	);
}
