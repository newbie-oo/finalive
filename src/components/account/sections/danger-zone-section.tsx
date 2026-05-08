"use client";

import { useState } from "react";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { deleteCurrentAccountAction } from "@/server/actions/delete-account";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, FieldHelper } from "@/components/ui/label";
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
import { FormAlert } from "@/components/forms/form-alert";

interface DangerZoneSectionProps {
	onDeleted: () => void;
}

export function DangerZoneSection({ onDeleted }: DangerZoneSectionProps) {
	const [open, setOpen] = useState(false);
	const [confirmText, setConfirmText] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function reset() {
		setConfirmText("");
		setPassword("");
		setError(null);
	}

	async function handleDelete() {
		if (confirmText !== "DELETE") {
			setError("พิมพ์ DELETE เพื่อยืนยัน");
			return;
		}
		setSubmitting(true);
		setError(null);
		const res = await deleteCurrentAccountAction({
			password: password || undefined,
		});
		if (!res.ok) {
			setSubmitting(false);
			if (res.error === "wrong_password") {
				setError("รหัสผ่านไม่ถูกต้อง");
			} else if (res.error === "unauthorized") {
				setError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
			} else {
				setError("ไม่สามารถลบบัญชีได้ กรุณาลองใหม่");
			}
			return;
		}
		onDeleted();
	}

	return (
		<Card className="border-destructive/30">
			<div className="space-y-3">
				<h2 className="text-h3 inline-flex items-center gap-2 text-destructive-foreground">
					<WarningIcon size={18} weight="fill" /> เขตอันตราย
				</h2>
				<p className="text-body text-muted-foreground">
					ลบบัญชีถาวร — เนื้อหาที่เรียน ความคืบหน้า และคำถามจะถูกลบ
					ใบประกาศที่ออกแล้วยังคงตรวจสอบได้ ไม่สามารถกู้คืนได้หลังจากกดยืนยัน
				</p>
				<AlertDialog
					open={open}
					onOpenChange={(o) => {
						setOpen(o);
						if (!o) reset();
					}}
				>
					<AlertDialogTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="md"
							className="text-destructive-foreground hover:bg-destructive-bg"
						>
							ลบบัญชีถาวร
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle className="text-destructive-foreground">
								ยืนยันลบบัญชีถาวร?
							</AlertDialogTitle>
							<AlertDialogDescription>
								การดำเนินการนี้ไม่สามารถย้อนกลับได้ —
								ข้อมูลทั้งหมดจะถูกลบทันทีหลังจากยืนยัน
							</AlertDialogDescription>
						</AlertDialogHeader>
						<div className="space-y-4">
							<p className="text-body text-foreground">
								พิมพ์{" "}
								<code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-uism">
									DELETE
								</code>{" "}
								เพื่อยืนยัน และกรอกรหัสผ่านปัจจุบัน (เฉพาะบัญชีที่ตั้งรหัสผ่านไว้)
							</p>
							<div>
								<Label htmlFor="confirm" required>
									คำยืนยัน
								</Label>
								<Input
									id="confirm"
									type="text"
									value={confirmText}
									onChange={(e) => setConfirmText(e.target.value)}
									placeholder="DELETE"
									autoComplete="off"
								/>
							</div>
							<div>
								<Label htmlFor="delete-password">รหัสผ่านปัจจุบัน</Label>
								<Input
									id="delete-password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									autoComplete="current-password"
								/>
								<FieldHelper>
									เว้นว่างหากเข้าสู่ระบบด้วย Google เท่านั้น
								</FieldHelper>
							</div>
							<FormAlert message={error} variant="destructive" />
						</div>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={submitting}>ยกเลิก</AlertDialogCancel>
							<AlertDialogAction
								variant="primary"
								disabled={submitting || confirmText !== "DELETE"}
								onClick={(e) => {
									e.preventDefault();
									handleDelete();
								}}
								className="bg-destructive hover:bg-destructive/90"
							>
								{submitting ? "กำลังลบ..." : "ยืนยันลบบัญชี"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</Card>
	);
}
