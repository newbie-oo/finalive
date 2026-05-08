import { getSession } from "@/server/auth-session";
import {
	PublicShellClient,
	type PublicShellUser,
} from "./public-shell-client";

interface PublicShellProps {
	children: React.ReactNode;
	/** When true, suppress the public footer — used by admin/full-bleed shells. */
	hideFooter?: boolean;
	/** When true, drop the global max-w container around the main slot so admin
	 * sidebar layouts can fill the viewport. */
	unboundedMain?: boolean;
}

/**
 * Server-side shell. Resolves the current session up-front and forwards
 * the user (or null) to the client island. Without this server seed
 * the client `useSession()` returned null on first paint, so the header
 * flashed login/signup buttons for one frame before swapping to the
 * avatar — visible on every reload.
 */
export async function PublicShell({
	children,
	hideFooter,
	unboundedMain,
}: PublicShellProps) {
	const session = await getSession();
	const initialUser: PublicShellUser | null = session?.user
		? {
				name: session.user.name,
				email: session.user.email,
				image:
					(session.user as { image?: string | null }).image ?? null,
				role: session.user.role,
			}
		: null;

	return (
		<PublicShellClient
			initialUser={initialUser}
			hideFooter={hideFooter}
			unboundedMain={unboundedMain}
		>
			{children}
		</PublicShellClient>
	);
}
