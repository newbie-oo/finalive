"use client";

import { useRouter } from "next/navigation";
import { EmailVerifyBanner } from "@/components/account/email-verify-banner";
import { ProfileSection } from "@/components/account/sections/profile-section";
import { ChangePasswordSection } from "@/components/account/sections/change-password-section";
import { SessionSection } from "@/components/account/sections/session-section";
import { DangerZoneSection } from "@/components/account/sections/danger-zone-section";

interface AccountPanelsProps {
	initialName: string;
	email: string;
	emailVerified: boolean;
	hasCredential: boolean;
}

/**
 * Client island for the /account page. Receives the initial profile +
 * credential-account flag from the Server Component parent so there's no
 * loading flash and no client-side useSession round-trip on mount.
 */
export function AccountPanels({
	initialName,
	email,
	emailVerified,
	hasCredential,
}: AccountPanelsProps) {
	const router = useRouter();
	const refresh = () => router.refresh();
	const replaceLogin = () => {
		router.replace("/login");
		router.refresh();
	};

	return (
		<>
			{!emailVerified && <EmailVerifyBanner email={email} />}
			<ProfileSection name={initialName} email={email} onSaved={refresh} />
			{hasCredential && <ChangePasswordSection />}
			<SessionSection onAllRevoked={replaceLogin} />
			<DangerZoneSection onDeleted={replaceLogin} />
		</>
	);
}
