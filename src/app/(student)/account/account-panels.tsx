"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
	CheckCircle,
	SignOut,
	WarningIcon,
	Eye,
	EyeSlash,
} from "@phosphor-icons/react";
import { authClient } from "@/lib/auth-client";
import { deleteCurrentAccountAction } from "@/server/actions/delete-account";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, FieldError, FieldHelper } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { EmailVerifyBanner } from "@/components/account/email-verify-banner";
import { SessionsList } from "@/components/account/sessions-list";

const profileSchema = z.object({
	name: z.string().min(1, "กรุณากรอกชื่อ"),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
	currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
	newPassword: z.string().min(8, "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"),
});
type PasswordForm = z.infer<typeof passwordSchema>;

interface AccountPanelsProps {
	initialName: string;
	email: string;
	emailVerified: boolean;
	hasCredential: boolean;
}

/**
 * Client island for the /account page. Receives the initial profile +
 * credential-account flag from the Server Component parent so there's no
 * loading flash and no client-side useSession round-trip on mount.
 */
export function AccountPanels({
	initialName,
	email,
	emailVerified,
	hasCredential,
}: AccountPanelsProps) {
	const router = useRouter();
	const refresh = () => router.refresh();
	const replaceLogin = () => {
		router.replace("/login");
		router.refresh();
	};

	return (
		<>
			{!emailVerified && <EmailVerifyBanner email={email} />}
			<ProfileSection name={initialName} email={email} onSaved={refresh} />
			{hasCredential && <ChangePasswordSection />}
			<SessionSection onAllRevoked={replaceLogin} />
			<DangerZoneSection onDeleted={replaceLogin} />
		</>
	);
}

function ProfileSection({
	name,
	email,
	onSaved,
}: {
	name: string;
	email: string;
	onSaved: () => void;
}) {
	const [saved, setSaved] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<ProfileForm>({
		resolver: zodResolver(profileSchema),
		values: { name },
	});

	async function onSubmit(data: ProfileForm) {
		setSaved(false);
		setServerError(null);
		const result = await authClient.updateUser({ name: data.name });
		if (result.error) {
			setServerError("ไม่สามารถบันทึกได้");
			return;
		}
		setSaved(true);
		onSaved();
	}

	return (
		<Card>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
				<h2 className="text-h3">ข้อมูลบัญชี</h2>
				<div>
					<Label htmlFor="name" required>
						ชื่อ
					</Label>
					<Input
						id="name"
						type="text"
						autoComplete="name"
						invalid={!!errors.name}
						{...register("name")}
					/>
					{errors.name && <FieldError>{errors.name.message}</FieldError>}
				</div>
				<div>
					<Label>อีเมล</Label>
					<p className="text-body text-foreground">{email}</p>
				</div>
				{saved && (
					<Alert variant="success">
						<CheckCircle size={16} weight="fill" />
						<AlertDescription>บันทึกสำเร็จ</AlertDescription>
					</Alert>
				)}
				{serverError && (
					<Alert variant="destructive">
						<WarningIcon size={16} weight="fill" />
						<AlertDescription>{serverError}</AlertDescription>
					</Alert>
				)}
				<div className="pt-1">
					<Button
						type="submit"
						variant="primary"
						size="md"
						disabled={isSubmitting}
					>
						{isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
					</Button>
				</div>
			</form>
		</Card>
	);
}

function ChangePasswordSection() {
	const [saved, setSaved] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
	const [showCurrent, setShowCurrent] = useState(false);
	const [showNew, setShowNew] = useState(false);
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<PasswordForm>({
		resolver: zodResolver(passwordSchema),
	});

	async function onSubmit(data: PasswordForm) {
		setSaved(false);
		setServerError(null);
		const result = await authClient.changePassword({
			currentPassword: data.currentPassword,
			newPassword: data.newPassword,
		});
		if (result.error) {
			setServerError("รหัสผ่านปัจจุบันไม่ถูกต้อง หรือไม่สามารถเปลี่ยนได้");
			return;
		}
		setSaved(true);
		reset();
	}

	return (
		<Card>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
				<h2 className="text-h3">เปลี่ยนรหัสผ่าน</h2>
				<p className="text-body text-muted-foreground">
					ถ้าคุณเข้าสู่ระบบด้วย Google เท่านั้น สามารถข้ามส่วนนี้ได้
				</p>
				<div>
					<Label htmlFor="currentPassword" required>
						รหัสผ่านปัจจุบัน
					</Label>
					<div className="relative">
						<Input
							id="currentPassword"
							type={showCurrent ? "text" : "password"}
							autoComplete="current-password"
							invalid={!!errors.currentPassword}
							className="pr-10"
							{...register("currentPassword")}
						/>
						<button
							type="button"
							onClick={() => setShowCurrent((v) => !v)}
							className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
							tabIndex={-1}
							aria-label={showCurrent ? "Hide password" : "Show password"}
						>
							{showCurrent ? <EyeSlash size={18} /> : <Eye size={18} />}
						</button>
					</div>
					{errors.currentPassword && (
						<FieldError>{errors.currentPassword.message}</FieldError>
					)}
				</div>
				<div>
					<Label htmlFor="newPassword" required>
						รหัสผ่านใหม่
					</Label>
					<div className="relative">
						<Input
							id="newPassword"
							type={showNew ? "text" : "password"}
							autoComplete="new-password"
							invalid={!!errors.newPassword}
							className="pr-10"
							{...register("newPassword")}
						/>
						<button
							type="button"
							onClick={() => setShowNew((v) => !v)}
							className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
							tabIndex={-1}
							aria-label={showNew ? "Hide password" : "Show password"}
						>
							{showNew ? <EyeSlash size={18} /> : <Eye size={18} />}
						</button>
					</div>
					{errors.newPassword ? (
						<FieldError>{errors.newPassword.message}</FieldError>
					) : (
						<FieldHelper>อย่างน้อย 8 ตัวอักษร</FieldHelper>
					)}
				</div>
				{saved && (
					<Alert variant="success">
						<CheckCircle size={16} weight="fill" />
						<AlertDescription>เปลี่ยนรหัสผ่านสำเร็จ</AlertDescription>
					</Alert>
				)}
				{serverError && (
					<Alert variant="destructive">
						<WarningIcon size={16} weight="fill" />
						<AlertDescription>{serverError}</AlertDescription>
					</Alert>
				)}
				<Button
					type="submit"
					variant="primary"
					size="md"
					disabled={isSubmitting}
				>
					{isSubmitting ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
				</Button>
			</form>
		</Card>
	);
}

function SessionSection({ onAllRevoked }: { onAllRevoked: () => void }) {
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
				{error && (
					<Alert variant="destructive">
						<WarningIcon size={16} weight="fill" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
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

function DangerZoneSection({ onDeleted }: { onDeleted: () => void }) {
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
							{error && (
								<Alert variant="destructive">
									<WarningIcon size={16} weight="fill" />
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}
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
