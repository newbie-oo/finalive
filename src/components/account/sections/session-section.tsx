"use client";

import { useState } from "react";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SessionsList } from "@/components/account/sessions-list";
import { FormAlert } from "@/components/forms/form-alert";

interface SessionSectionProps {
	onAllRevoked: () => void;
}

export function SessionSection({ onAllRevoked }: SessionSectionProps) {
	const [open, setOpen] = useState(false);
	const [revoking, setRevoking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleRevoke() {
		setRevoking(true);
		setError(null);
		try {
			const res = await fetch("/api/auth/revoke-sessions", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{}",
			});
			if (!res.ok) {
				setError("ไม่สามารถออกจากระบบได้ในตอนนี้");
				setRevoking(false);
				return;
			}
			onAllRevoked();
		} catch {
			setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
			setRevoking(false);
		}
	}

	return (
		<Card>
			<div className="space-y-3">
				<h2 className="text-h3">เซสชัน</h2>
				<p className="text-body text-muted-foreground">
					หากคุณสงสัยว่าบัญชีถูกเข้าใช้งานจากอุปกรณ์อื่น
					กดปุ่มด้านล่างเพื่อออกจากระบบทุกอุปกรณ์รวมถึงอุปกรณ์นี้
				</p>
				<SessionsList />
				<FormAlert message={error} variant="destructive" />
				<AlertDialog open={open} onOpenChange={setOpen}>
					<AlertDialogTrigger asChild>
						<Button type="button" variant="ghost" size="md" disabled={revoking}>
							<SignOut size={16} className="mr-1" />
							{revoking ? "กำลังออกจากระบบ..." : "ออกจากระบบทุกอุปกรณ์"}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>ออกจากระบบทุกอุปกรณ์?</AlertDialogTitle>
							<AlertDialogDescription>
								เซสชันบนอุปกรณ์ทั้งหมดจะถูกตัด รวมถึงอุปกรณ์นี้
								คุณจะต้องเข้าสู่ระบบใหม่
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
							<AlertDialogAction
								variant="primary"
								onClick={handleRevoke}
								className="bg-destructive hover:bg-destructive/90"
							>
								ออกจากระบบ
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</Card>
	);
}
