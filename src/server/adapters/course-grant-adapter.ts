import { EnrollmentRepo } from "@/server/repos/enrollment";
import { sendGrantCourseEmail } from "@/server/services/mailer";

export async function createEnrollmentFromGrant(args: {
	userId: string;
	courseId: string;
	grantId: string;
}): Promise<void> {
	await EnrollmentRepo.create({
		userId: args.userId,
		courseId: args.courseId,
		source: "admin_grant",
		sourceGrantId: args.grantId,
		priceAtPurchase: "0",
		status: "active",
	});
}

export async function sendGrantNotification(n: {
	to: string;
	name: string | null;
	courseTitle: string;
	learnUrl: string;
}): Promise<void> {
	await sendGrantCourseEmail({
		to: n.to,
		name: n.name ?? "",
		courseTitle: n.courseTitle,
		learnUrl: n.learnUrl,
	});
}
