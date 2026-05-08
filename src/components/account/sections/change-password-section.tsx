"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, FieldError, FieldHelper } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { FormAlert } from "@/components/forms/form-alert";

const passwordSchema = z.object({
	currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
	newPassword: z.string().min(8, "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"),
});
type PasswordForm = z.infer<typeof passwordSchema>;

export function ChangePasswordSection() {
	const [saved, setSaved] = useState(false);
	const [serverError, setServerError] = useState<string | null>(null);
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
					<PasswordInput
						id="currentPassword"
						autoComplete="current-password"
						invalid={!!errors.currentPassword}
						{...register("currentPassword")}
					/>
					{errors.currentPassword && (
						<FieldError>{errors.currentPassword.message}</FieldError>
					)}
				</div>
				<div>
					<Label htmlFor="newPassword" required>
						รหัสผ่านใหม่
					</Label>
					<PasswordInput
						id="newPassword"
						autoComplete="new-password"
						invalid={!!errors.newPassword}
						{...register("newPassword")}
					/>
					{errors.newPassword ? (
						<FieldError>{errors.newPassword.message}</FieldError>
					) : (
						<FieldHelper>อย่างน้อย 8 ตัวอักษร</FieldHelper>
					)}
				</div>
				<FormAlert
					message={saved ? "เปลี่ยนรหัสผ่านสำเร็จ" : null}
					variant="success"
				/>
				<FormAlert message={serverError} variant="destructive" />
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
