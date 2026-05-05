"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
	CheckCircle,
	Check,
	Clock,
	BookOpen,
	EnvelopeSimple,
	LockSimple,
} from "@phosphor-icons/react";
import { signUp } from "@/lib/auth-client";
import { PublicShell } from "@/components/layouts/public-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label, FieldError, FieldHelper } from "@/components/ui/label";

const registerSchema = z.object({
	name: z.string().min(1, "กรุณากรอกชื่อ"),
	email: z.string().email("กรุณากรอกอีเมลที่ถูกต้อง"),
	password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
	acceptTerms: z.literal(true, {
		errorMap: () => ({
			message: "กรุณายอมรับข้อตกลงและนโยบายความเป็นส่วนตัว",
		}),
	}),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
	const [serverError, setServerError] = useState<string | null>(null);
	const [registered, setRegistered] = useState(false);
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<RegisterForm>();

	async function onSubmit(data: RegisterForm) {
		setServerError(null);
		const parsed = registerSchema.safeParse(data);
		if (!parsed.success) {
			for (const issue of parsed.error.issues) {
				const field = issue.path[0] as keyof RegisterForm;
				setError(field, { message: issue.message });
			}
			return;
		}

		const result = await signUp.email({
			email: parsed.data.email,
			password: parsed.data.password,
			name: parsed.data.name,
		});

		if (result.error) {
			setServerError(result.error.message ?? "สมัครสมาชิกไม่สำเร็จ");
			return;
		}

		setRegistered(true);
	}

	if (registered) {
		return (
			<PublicShell hideFooter>
				<div className="flex min-h-full items-center justify-center px-6 py-12">
					<div className="w-full max-w-[400px] text-center">
						<CheckCircle
							size={56}
							weight="fill"
							className="mx-auto mb-4 text-success"
						/>
						<h1 className="text-h2 mb-2">สมัครสมาชิกสำเร็จ</h1>
						<p className="text-body text-(--foreground-muted)">
							ตรวจสอบอีเมลเพื่อยืนยันบัญชี
						</p>
						<p className="mb-6 mt-2 text-body text-(--foreground-muted)">
							เราส่งลิงก์ยืนยันไปยังอีเมลของคุณแล้ว
						</p>
						<Button asChild variant="primary" size="lg" className="w-full">
							<Link href="/login">ไปหน้าเข้าสู่ระบบ</Link>
						</Button>
					</div>
				</div>
			</PublicShell>
		);
	}

	return (
		<PublicShell hideFooter>
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

						{/* Step indicator */}
						<div className="space-y-2">
							<div className="flex items-center justify-between text-uism text-(--foreground-muted)">
								<span>ขั้นตอนที่ 1 จาก 2</span>
							</div>
							<div className="h-1.5 w-full rounded-full bg-(--surface-muted)">
								<div className="h-1.5 w-1/2 rounded-full bg-(--primary)" />
							</div>
						</div>

						<div className="space-y-5">
							<header className="space-y-1">
								<h1 className="text-h2">สมัครสมาชิก</h1>
								<p className="text-body text-(--foreground-muted)">
									เริ่มต้นเรียนคอร์สแรกของคุณ
								</p>
							</header>

							<Suspense
								fallback={
									<div className="h-10 w-full animate-pulse rounded-md bg-(--surface-muted)" />
								}
							>
								<GoogleSignInButton mode="register" />
							</Suspense>

							<div className="flex items-center gap-3">
								<div className="h-px flex-1 bg-(--border)" />
								<span className="text-uism text-(--foreground-muted)">หรือ</span>
								<div className="h-px flex-1 bg-(--border)" />
							</div>

							<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
								<div>
									<Label htmlFor="name" required>
										ชื่อ-นามสกุล
									</Label>
									<Input
										id="name"
										type="text"
										autoComplete="name"
										invalid={!!errors.name}
										{...register("name")}
									/>
									{errors.name && (
										<FieldError>{errors.name.message}</FieldError>
									)}
								</div>

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
									<Label htmlFor="password" required>
										รหัสผ่าน
									</Label>
									<PasswordInput
										id="password"
										autoComplete="new-password"
										invalid={!!errors.password}
										showStrength
										icon={<LockSimple size={18} />}
										{...register("password")}
									/>
									{errors.password ? (
										<FieldError>{errors.password.message}</FieldError>
									) : (
										<FieldHelper>อย่างน้อย 8 ตัวอักษร</FieldHelper>
									)}
								</div>

								<div>
									<label className="flex items-start gap-2 text-uism">
										<input
											id="acceptTerms"
											type="checkbox"
											className="mt-0.5 h-4 w-4 accent-(--primary)"
											aria-invalid={!!errors.acceptTerms}
											{...register("acceptTerms")}
										/>
										<span className="text-(--foreground-muted)">
											ฉันยอมรับ{" "}
											<Link
												href="/legal/terms"
												target="_blank"
												className="text-(--primary) hover:underline"
											>
												ข้อตกลงการใช้งาน
											</Link>{" "}
											และ{" "}
											<Link
												href="/legal/privacy"
												target="_blank"
												className="text-(--primary) hover:underline"
											>
												นโยบายความเป็นส่วนตัว
											</Link>
										</span>
									</label>
									{errors.acceptTerms && (
										<FieldError>{errors.acceptTerms.message}</FieldError>
									)}
								</div>

								{serverError && (
									<p
										role="alert"
										className="rounded-md bg-destructive-bg px-3 py-2 text-uism text-destructive-foreground"
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
									{isSubmitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
								</Button>
							</form>
						</div>

						<div className="text-center text-body text-(--foreground-muted)">
							มีบัญชีอยู่แล้ว?{" "}
							<Link
								href="/login"
								className="font-medium text-(--primary) hover:underline"
							>
								เข้าสู่ระบบ
							</Link>
						</div>
					</div>
				</div>

				{/* Right Panel — Benefits */}
				<div
					className="relative hidden flex-col justify-between p-12 text-white md:flex md:w-1/2 lg:w-[55%]"
					style={{
						background: "linear-gradient(160deg, #4F46E5, #3730A3)",
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
								id="dots-register"
								x="0"
								y="0"
								width="20"
								height="20"
								patternUnits="userSpaceOnUse"
							>
								<circle cx="2" cy="2" r="1" fill="white" />
							</pattern>
						</defs>
						<rect width="100%" height="100%" fill="url(#dots-register)" />
					</svg>

					<div className="relative z-10 space-y-8">
						<div>
							<h2 className="mb-4 text-3xl font-bold leading-tight">
								เริ่มเรียนฟรีวันนี้
							</h2>
							<div className="space-y-3">
								<div className="flex items-center gap-3">
									<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-400 text-indigo-900">
										<Check size={14} weight="bold" />
									</div>
									<p className="text-white/90">เข้าถึงคอร์สตัวอย่างฟรีทันที</p>
								</div>
								<div className="flex items-center gap-3">
									<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-400 text-indigo-900">
										<Check size={14} weight="bold" />
									</div>
									<p className="text-white/90">รับใบประกาศเมื่อเรียนจบ</p>
								</div>
								<div className="flex items-center gap-3">
									<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-400 text-indigo-900">
										<Check size={14} weight="bold" />
									</div>
									<p className="text-white/90">เรียนได้ตลอดชีพ ไม่หมดอายุ</p>
								</div>
								<div className="flex items-center gap-3">
									<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-400 text-indigo-900">
										<Check size={14} weight="bold" />
									</div>
									<p className="text-white/90">ถามผู้สอนได้ผ่าน Q&A</p>
								</div>
							</div>
						</div>

						<div>
							<p className="mb-3 text-sm font-medium text-white/70">
								คอร์สฟรีของคุณ
							</p>
							<div className="space-y-3">
								<div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500">
										<BookOpen size={20} weight="fill" className="text-white" />
									</div>
									<div className="min-w-0">
										<p className="truncate font-medium">พื้นฐานการลงทุนหุ้นไทย</p>
										<div className="flex items-center gap-2 text-xs text-white/70">
											<span className="flex items-center gap-1">
												<Clock size={12} />4 ชม.
											</span>
											<span>·</span>
											<span>12 บท</span>
										</div>
									</div>
								</div>
								<div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500">
										<BookOpen size={20} weight="fill" className="text-white" />
									</div>
									<div className="min-w-0">
										<p className="truncate font-medium">
											Excel for Finance — Intro
										</p>
										<div className="flex items-center gap-2 text-xs text-white/70">
											<span className="flex items-center gap-1">
												<Clock size={12} />1 ชม.
											</span>
											<span>·</span>
											<span>5 บท</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</PublicShell>
	);
}
