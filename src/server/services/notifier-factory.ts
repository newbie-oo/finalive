import "server-only";
import { db } from "@/db/client";
import { EmailCourseCompletionNotifier } from "./notifier";

export function makeEmailCourseCompletionNotifier(): EmailCourseCompletionNotifier {
	return new EmailCourseCompletionNotifier(db);
}
