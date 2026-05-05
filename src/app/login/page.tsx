"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
	EnvelopeSimple,
	LockSimple,
	PlayCircle,
	Table,
	Certificate,
} from "@phosphor-icons/react";
import { signIn } from "@/lib/auth-client";
import { PublicShell } from "@/components/layouts/public-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label, FieldError } from "@/components/ui/label";

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
		setError,
		formState: { errors, isSubmitting },
	} = useForm<LoginForm>();

	async function onSubmit(data: LoginForm) {
		setServerError(null);
		const parsed = loginSchema.safeParse(data);
		if (!parsed.success) {
			for (const issue of parsed.error.issues) {
				const field = issue.path[0] as keyof LoginForm;
				setError(field, { message: issue.message });
			}
			return;
		}

		const result = await signIn.email({
			email: parsed.data.email,
			password: parsed.data.password,
			rememberMe: parsed.data.rememberMe,
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
		<div className="flex min-h-full">
			{/* Left Panel — Form */}
			<div className="flex w-full flex-col items-center justify-center bg-(--surface) px-6 py-12 md:w-1/2 lg:w-[45%]">
				<div className="w-full max-w-[400px] space-y-6">
					{/* Logo */}
					<Link
						href="/"
						className="mx-auto flex items-center justify-center gap-2 text-(--foreground)"
					>
						<span
							className="h-2.5 w-2.5 rounded-full bg-(--primary)"
							aria-hidden
						/>
						<span className="text-[18px] font-semibold tracking-tight">
							Finalive
						</span>
					</Link>

					<div className="space-y-5">
						<header className="space-y-1">
							<h1 className="text-h2">เข้าสู่ระบบ</h1>
							<p className="text-body text-(--foreground-muted)">
								ยินดีต้อนรับกลับมา
							</p>
						</header>

						<GoogleSignInButton mode="login" />

						<div className="flex items-center gap-3">
							<div className="h-px flex-1 bg-(--border)" />
							<span className="text-uism text-(--foreground-muted)">หรือ</span>
							<div className="h-px flex-1 bg-(--border)" />
						</div>

						<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
							<div>
								<Label htmlFor="email" required>
									อีเมล
								</Label>
								<div className="relative">
									<EnvelopeSimple
										className="absolute left-3 top-1/2 -translate-y-1/2 text-(--foreground-muted)"
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
										className="mb-1.5 text-uism text-(--primary) hover:underline"
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
								<label className="flex items-center gap-2 text-uism">
									<input
										id="rememberMe"
										type="checkbox"
										className="h-4 w-4 accent-(--primary)"
										{...register("rememberMe")}
									/>
									<span className="text-(--foreground-muted)">จดจำฉันไว้</span>
								</label>
							</div>

							{serverError && (
								<p
									role="alert"
									className="rounded-md bg-(--destructive-bg) px-3 py-2 text-uism text-(--destructive-fg)"
								>
									{serverError}
								</p>
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

					<div className="text-center text-body text-(--foreground-muted)">
						ยังไม่มีบัญชี?{" "}
						<Link
							href="/register"
							className="font-medium text-(--primary) hover:underline"
						>
							สมัครสมาชิก
						</Link>
					</div>
				</div>
			</div>

			{/* Right Panel — Testimonial */}
			<div
				className="relative hidden flex-col justify-between p-12 text-white md:flex md:w-1/2 lg:w-[55%]"
				style={{
					background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
				}}
			>
				<svg
					className="absolute inset-0 opacity-10"
					width="100%"
					height="100%"
					aria-hidden
				>
					<defs>
						<pattern
							id="dots-login"
							x="0"
							y="0"
							width="20"
							height="20"
							patternUnits="userSpaceOnUse"
						>
							<circle cx="2" cy="2" r="1" fill="white" />
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#dots-login)" />
				</svg>

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
					<div className="flex items-start gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
							<PlayCircle size={20} weight="fill" />
						</div>
						<div>
							<p className="font-medium">วิดีโอคุณภาพสูง</p>
							<p className="text-sm text-white/70">เรียนได้ทุกอุปกรณ์ ตลอดชีพ</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
							<Table size={20} weight="fill" />
						</div>
						<div>
							<p className="font-medium">Excel template ใช้งานจริง</p>
							<p className="text-sm text-white/70">ดาวน์โหลดทุกไฟล์เพื่อต่อยอด</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
							<Certificate size={20} weight="fill" />
						</div>
						<div>
							<p className="font-medium">ใบประกาศที่ตรวจสอบได้</p>
							<p className="text-sm text-white/70">แชร์ลง LinkedIn ได้ทันที</p>
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
			</div>
		</div>
	);
}

export default function LoginPage() {
	return (
		<PublicShell hideFooter>
			<Suspense
				fallback={
					<div className="flex min-h-full">
						<div className="flex w-full flex-col items-center justify-center px-6 py-12 md:w-1/2 lg:w-[45%]">
							<div className="w-full max-w-[400px] space-y-6">
								<div className="mx-auto h-8 w-48 animate-pulse rounded-md bg-(--surface-muted)" />
								<div className="h-10 w-full animate-pulse rounded-md bg-(--surface-muted)" />
								<div className="h-10 w-full animate-pulse rounded-md bg-(--surface-muted)" />
								<div className="h-12 w-full animate-pulse rounded-md bg-(--surface-muted)" />
							</div>
						</div>
					</div>
				}
			>
				<LoginForm />
			</Suspense>
		</PublicShell>
	);
}
