import { CheckCircle, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FormAlertProps {
	/** Renders nothing when null/undefined/empty so callers can pass state directly. */
	message: string | null | undefined;
	variant: "success" | "destructive";
}

/**
 * Inline status message for forms — destructive (server error) or success
 * (after save). Replaces the 6-line `<Alert><WarningIcon/><AlertDescription>`
 * pattern that was duplicated across the auth pages and the account panels.
 */
export function FormAlert({ message, variant }: FormAlertProps) {
	if (!message) return null;
	const Icon = variant === "success" ? CheckCircle : WarningIcon;
	return (
		<Alert variant={variant}>
			<Icon size={16} weight="fill" />
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
}
