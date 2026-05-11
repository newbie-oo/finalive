import { PublicShell } from "@/components/layouts/public-shell";
import { resolveHomePage } from "@/server/presenters/home";
import { HomeView } from "./_home/home-view";

export const dynamic = "force-dynamic";

export default async function Home() {
	const vm = await resolveHomePage();
	return (
		<PublicShell>
			<HomeView {...vm} />
		</PublicShell>
	);
}
