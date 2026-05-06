import "server-only";
import { db } from "@/db/client";
import { EmailSlipNotifier } from "./slip-notifier";

export function makeEmailSlipNotifier(): EmailSlipNotifier {
	return new EmailSlipNotifier(db);
}
