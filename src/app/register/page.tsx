"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
	CheckCircle,
	Check,
	EnvelopeSimple,
	LockSimple,
	Play,
	WarningIcon,
} from "@phosphor-icons/react";
import { signUp } from "@/lib/auth-client";
import { PublicShell } from "@/components/layouts/public-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label, FieldError, FieldHelper } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

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
		control,
		formState: { errors, isSubmitting },
	} = useForm<RegisterForm>({
		resolver: zodResolver(registerSchema),
	});

	async function onSubmit(data: RegisterForm) {
		setServerError(null);

		const result = await signUp.email({
			email: data.email,
			password: data.password,
			name: data.name,
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
						<p className="text-body text-muted-foreground">
							ตรวจสอบอีเมลเพื่อยืนยันบัญชี
						</p>
						<p className="mb-6 mt-2 text-body text-muted-foreground">
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
			<AuthSplitLayout
				gradient="linear-gradient(160deg, #4F46E5, #3730A3)"
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

						<div className="space-y-2">
							<div className="flex items-center justify-between text-uism text-muted-foreground">
								<span>
									ขั้นตอนที่{" "}
									<span className="font-semibold text-primary">1</span> จาก{" "}
									<span className="font-semibold">2</span>
								</span>
								<span className="font-semibold text-primary">50%</span>
							</div>
							<Progress value={50} className="h-1" />
						</div>

						<div className="space-y-5">
							<header className="space-y-1">
								<h1 className="text-h2">สมัครสมาชิก</h1>
								<p className="text-body text-muted-foreground">
									เริ่มเรียนฟรีวันนี้ ไม่ต้องใช้บัตรเครดิต
								</p>
							</header>

							<Suspense
								fallback={
									<div className="h-10 w-full animate-pulse rounded-md bg-muted" />
								}
							>
								<GoogleSignInButton mode="register" />
							</Suspense>

							<div className="flex items-center gap-3">
								<div className="h-px flex-1 bg-border" />
								<span className="text-uism text-muted-foreground">หรือ</span>
								<div className="h-px flex-1 bg-border" />
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
									<Controller
										control={control}
										name="acceptTerms"
										render={({ field }) => (
											<label
												htmlFor="acceptTerms"
												className="flex cursor-pointer items-start gap-2 text-uism"
											>
												<Checkbox
													id="acceptTerms"
													className="mt-0.5"
													checked={!!field.value}
													onCheckedChange={(checked) =>
														field.onChange(checked === true)
													}
													aria-invalid={!!errors.acceptTerms}
												/>
												<span className="text-muted-foreground">
													ฉันยอมรับ{" "}
													<Link
														href="/legal/terms"
														target="_blank"
														className="text-primary hover:underline"
													>
														ข้อตกลงการใช้งาน
													</Link>{" "}
													และ{" "}
													<Link
														href="/legal/privacy"
														target="_blank"
														className="text-primary hover:underline"
													>
														นโยบายความเป็นส่วนตัว
													</Link>
												</span>
											</label>
										)}
									/>
									{errors.acceptTerms && (
										<FieldError>{errors.acceptTerms.message}</FieldError>
									)}
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
									{isSubmitting ? "กำลังสมัคร..." : "สมัครสมาชิกฟรี"}
								</Button>
							</form>
						</div>

						<div className="text-center text-body text-muted-foreground">
							มีบัญชีอยู่แล้ว?{" "}
							<Link
								href="/login"
								className="font-medium text-primary hover:underline"
							>
								เข้าสู่ระบบ
							</Link>
						</div>
					</div>
				}
				right={
					<>
						<div className="relative z-10">
							<h2 className="mb-8 text-3xl font-bold leading-tight">
								เริ่มเรียนฟรีวันนี้
							</h2>
							<div className="flex flex-col gap-5">
								{[
									["เข้าถึงคอร์สตัวอย่างฟรีทันที", "เริ่มเรียนได้ภายใน 2 นาที"],
									["รับใบประกาศเมื่อเรียนจบ", "พิมพ์หรือแชร์ลง LinkedIn ได้"],
									["เรียนได้ตลอดชีพ ไม่หมดอายุ", "กลับมาทบทวนได้เสมอ"],
									["ถามผู้สอนได้ผ่าน Q&A", "ตอบกลับภายใน 24 ชั่วโมง"],
								].map(([title, sub], i) => (
									<div key={i} className="flex items-start gap-3.5">
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
											<Check size={16} className="text-white" weight="bold" />
										</div>
										<div>
											<p className="text-[15px] font-semibold text-white">
												{title}
											</p>
											<p className="text-[13px] text-white/70">{sub}</p>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="relative z-10">
							<p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/80">
								คอร์สฟรีของคุณ
							</p>
							<div className="flex flex-col gap-2.5">
								{[
									["พื้นฐานการลงทุนหุ้นไทย", "4 ชม. · 12 บท", "#10B981"],
									["Excel for Finance — Intro", "1 ชม. · 5 บท", "#F97316"],
								].map(([title, meta, color], i) => (
									<div
										key={i}
										className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 p-3"
									>
										<div
											className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg"
											style={{ backgroundColor: color }}
										>
											<Play size={18} className="text-white" />
										</div>
										<div className="flex-1">
											<p className="text-[14px] font-semibold text-white">
												{title}
											</p>
											<p className="text-[12px] text-white/70">{meta}</p>
										</div>
										<span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
											ฟรี
										</span>
									</div>
								))}
							</div>
						</div>
					</>
				}
			/>
		</PublicShell>
	);
}
