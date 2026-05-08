"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
	EnvelopeSimple,
	LockSimple,
	Video,
	FileText,
	Certificate,
	WarningIcon,
} from "@phosphor-icons/react";
import { signIn } from "@/lib/auth-client";
import { PublicShellClient as PublicShell } from "@/components/layouts/public-shell-client";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label, FieldError } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

const loginSchema = z.object({
	email: z.string().email("กรุณากรอกอีเมลที่ถูกต้อง"),
	password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
	rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

// Default landing after login: student dashboard, admin dashboard for admins.
const STUDENT_DEFAULT = "/dashboard";
const ADMIN_DEFAULT = "/admin";

function defaultFor(role: string | null | undefined): string {
	return role === "admin" ? ADMIN_DEFAULT : STUDENT_DEFAULT;
}

// Only allow internal redirect targets to defend against open-redirect attacks.
// Uses URL API to properly parse and validate the path.
function safeNext(raw: string | null, fallback: string): string {
	if (!raw) return fallback;
	try {
		const url = new URL(raw, "http://localhost");
		if (url.host !== "localhost") return fallback; // not a relative path
		return url.pathname + url.search;
	} catch {
		return fallback;
	}
}

function LoginForm() {
	const router = useRouter();
	const params = useSearchParams();
	const rawNext = params.get("next");
	const [serverError, setServerError] = useState<string | null>(null);
	const {
		register,
		handleSubmit,
		control,
		formState: { errors, isSubmitting },
	} = useForm<LoginForm>({
		resolver: zodResolver(loginSchema),
	});

	async function onSubmit(data: LoginForm) {
		setServerError(null);

		const result = await signIn.email({
			email: data.email,
			password: data.password,
			rememberMe: data.rememberMe,
		});

		if (result.error) {
			const errorCode = (result.error as { code?: string }).code;
			if (errorCode === "EMAIL_NOT_VERIFIED") {
				setServerError("อีเมลยังไม่ได้รับการยืนยัน กรุณาตรวจสอบกล่องจดหมายของคุณ");
			} else {
				setServerError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
			}
			return;
		}

		// Role lives on the user object that better-auth returns from signIn.
		const role = (result.data as { user?: { role?: string } } | null)?.user
			?.role;
		const next = safeNext(rawNext, defaultFor(role));
		router.push(next);
		router.refresh();
	}

	return (
		<AuthSplitLayout
			gradient="linear-gradient(135deg, #4F46E5, #7C3AED)"
			left={
				<div className="w-full max-w-[400px] space-y-6">
					<Link
						href="/"
						className="mx-auto flex items-center justify-center gap-2.5 text-foreground"
					>
						<Logo size={24} variant="mark" />
						<span className="text-[18px] font-semibold tracking-tight">
							Finalive
						</span>
					</Link>

					<div className="space-y-5">
						<header className="space-y-1">
							<h1 className="text-h2">เข้าสู่ระบบ</h1>
							<p className="text-body text-muted-foreground">
								ยินดีต้อนรับกลับมา
							</p>
						</header>

						<GoogleSignInButton mode="login" />

						<div className="flex items-center gap-3">
							<div className="h-px flex-1 bg-border" />
							<span className="text-uism text-muted-foreground">หรือ</span>
							<div className="h-px flex-1 bg-border" />
						</div>

						<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
							<div>
								<Label htmlFor="email" required>
									อีเมล
								</Label>
								<div className="relative">
									<EnvelopeSimple
										className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
										size={18}
									/>
									<Input
										id="email"
										type="email"
										autoComplete="email"
										invalid={!!errors.email}
										className="pl-10"
										{...register("email")}
									/>
								</div>
								{errors.email && (
									<FieldError>{errors.email.message}</FieldError>
								)}
							</div>

							<div>
								<div className="flex items-center justify-between">
									<Label htmlFor="password" required>
										รหัสผ่าน
									</Label>
									<Link
										href="/forgot-password"
										className="mb-1.5 text-uism text-primary hover:underline"
									>
										ลืมรหัสผ่าน?
									</Link>
								</div>
								<PasswordInput
									id="password"
									autoComplete="current-password"
									invalid={!!errors.password}
									icon={<LockSimple size={18} />}
									{...register("password")}
								/>
								{errors.password && (
									<FieldError>{errors.password.message}</FieldError>
								)}
							</div>

							<div className="flex items-center justify-between">
								<Controller
									control={control}
									name="rememberMe"
									render={({ field }) => (
										<label
											htmlFor="rememberMe"
											className="flex cursor-pointer items-center gap-2 text-uism"
										>
											<Checkbox
												id="rememberMe"
												checked={!!field.value}
												onCheckedChange={(checked) =>
													field.onChange(checked === true)
												}
											/>
											<span className="text-muted-foreground">จดจำฉันไว้</span>
										</label>
									)}
								/>
							</div>

							{serverError && (
								<Alert variant="destructive">
									<WarningIcon size={16} weight="fill" />
									<AlertDescription>{serverError}</AlertDescription>
								</Alert>
							)}

							<Button
								type="submit"
								variant="primary"
								size="lg"
								className="w-full"
								disabled={isSubmitting}
							>
								{isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
							</Button>
						</form>
					</div>

					<div className="text-center text-body text-muted-foreground">
						ยังไม่มีบัญชี?{" "}
						<Link
							href="/register"
							className="font-medium text-primary hover:underline"
						>
							สมัครสมาชิก
						</Link>
					</div>
				</div>
			}
			right={
				<>
					<div className="relative z-10">
						<p className="mb-3 text-sm font-medium tracking-wide text-white/80">
							เรียนรู้การเงินอย่างจริงจัง
						</p>
						<h2 className="mb-4 text-3xl font-bold leading-tight">
							พลิกความรู้การเงินเป็นทักษะที่ใช้งานได้จริง
						</h2>
						<p className="max-w-md text-base leading-relaxed text-white/80">
							คอร์สออนไลน์ที่ออกแบบมาสำหรับคนทำงานสายการเงิน เรียนรู้จากผู้สอนมืออาชีพ
							พร้อมเครื่องมือใช้งานจริง
						</p>
					</div>

					<div className="relative z-10 space-y-4">
						<div className="flex items-start gap-3.5">
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-white/15">
								<Video size={18} />
							</div>
							<div>
								<p className="text-[15px] font-semibold text-white">
									วิดีโอคุณภาพสูง
								</p>
								<p className="text-[13px] text-white/70">
									เรียนได้ทุกอุปกรณ์ ตลอดชีพ
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3.5">
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-white/15">
								<FileText size={18} />
							</div>
							<div>
								<p className="text-[15px] font-semibold text-white">
									Excel template ใช้งานจริง
								</p>
								<p className="text-[13px] text-white/70">
									ดาวน์โหลดทุกไฟล์เพื่อต่อยอด
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3.5">
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-white/15">
								<Certificate size={18} />
							</div>
							<div>
								<p className="text-[15px] font-semibold text-white">
									ใบประกาศที่ตรวจสอบได้
								</p>
								<p className="text-[13px] text-white/70">
									แชร์ลง LinkedIn ได้ทันที
								</p>
							</div>
						</div>
					</div>

					<div className="relative z-10 flex gap-8 border-t border-white/20 pt-8">
						<div>
							<p className="text-2xl font-bold">45+</p>
							<p className="text-sm text-white/70">คอร์ส</p>
						</div>
						<div>
							<p className="text-2xl font-bold">12</p>
							<p className="text-sm text-white/70">ผู้สอน CFA</p>
						</div>
						<div>
							<p className="text-2xl font-bold">ตลอดชีพ</p>
							<p className="text-sm text-white/70">การเข้าถึง</p>
						</div>
					</div>
				</>
			}
		/>
	);
}

export default function LoginPage() {
	return (
		<PublicShell hideFooter>
			<Suspense
				fallback={
					<AuthSplitLayout
						left={
							<div className="w-full max-w-[400px] space-y-6">
								<div className="mx-auto h-8 w-48 animate-pulse rounded-md bg-muted" />
								<div className="h-10 w-full animate-pulse rounded-md bg-muted" />
								<div className="h-10 w-full animate-pulse rounded-md bg-muted" />
								<div className="h-12 w-full animate-pulse rounded-md bg-muted" />
							</div>
						}
					/>
				}
			>
				<LoginForm />
			</Suspense>
		</PublicShell>
	);
}
