"use client";

import { useState } from "react";
import { EnvelopeOpen, WarningIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

interface EmailVerifyBannerProps {
	email: string;
}

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Yellow alert shown above the profile when the signed-in user has not yet
 * verified their email. Resend triggers Better Auth's
 * `sendVerificationEmail` and surfaces success/error inline so the user
 * knows the action took effect without leaving the page.
 */
export function EmailVerifyBanner({ email }: EmailVerifyBannerProps) {
	const [status, setStatus] = useState<Status>("idle");

	async function handleResend() {
		setStatus("sending");
		try {
			const result = await authClient.sendVerificationEmail({ email });
			if (result?.error) {
				setStatus("error");
				return;
			}
			setStatus("sent");
		} catch {
			setStatus("error");
		}
	}

	return (
		<Alert variant="warning">
			<EnvelopeOpen size={16} weight="fill" />
			<AlertTitle>ยืนยันอีเมล</AlertTitle>
			<AlertDescription>
				เราต้องการอีเมลที่ยืนยันแล้วเพื่อกู้คืนบัญชีและส่งใบเสร็จ
				{status === "sent" && (
					<p className="mt-2 inline-flex items-center gap-1 text-success">
						ส่งลิงก์ไปที่อีเมลแล้ว เปิดกล่องจดหมายเพื่อยืนยัน
					</p>
				)}
				{status === "error" && (
					<p className="mt-2 inline-flex items-center gap-1 text-destructive">
						<WarningIcon size={14} weight="fill" />
						ส่งไม่สำเร็จ ลองอีกครั้ง
					</p>
				)}
			</AlertDescription>
			<div className="mt-2.5 flex">
				<Button
					type="button"
					variant="primary"
					size="sm"
					onClick={handleResend}
					disabled={status === "sending"}
				>
					{status === "sending"
						? "กำลังส่ง..."
						: status === "sent"
						? "ส่งลิงก์ยืนยันอีกครั้ง"
						: "ส่งลิงก์ยืนยัน"}
				</Button>
			</div>
		</Alert>
	);
}
