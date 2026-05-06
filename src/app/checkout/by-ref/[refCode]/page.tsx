import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/server/auth-session";
import { PendingEnrollmentRepo } from "@/server/repos/pending-enrollment";
import {
	isActionable,
	type PendingStatus,
} from "@/server/services/pending-fsm";

export const dynamic = "force-dynamic";

export default async function CheckoutByRefPage({
	params,
}: {
	params: Promise<{ refCode: string }>;
}) {
	const { refCode } = await params;
	const { user } = await requireSession();

	const row = await PendingEnrollmentRepo.getByRefCode(refCode);
	if (!row) notFound();
	if (row.userId !== user.id) {
		// Same 404 for security — don't leak existence
		notFound();
	}
	if (!isActionable(row.status as PendingStatus)) {
		// Already paid / expired — send to enrollments
		redirect("/account/enrollments");
	}

	redirect(`/checkout/${row.id}`);
}
