"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { EmailFieldDisplay } from "@/components/account/email-field-display";
import { FormAlert } from "@/components/forms/form-alert";

const profileSchema = z.object({
	name: z.string().min(1, "กรุณากรอกชื่อ"),
});
type ProfileForm = z.infer<typeof profileSchema>;

interface ProfileSectionProps {
	name: string;
	email: string;
	onSaved: () => void;
}

export function ProfileSection({ name, email, onSaved }: ProfileSectionProps) {
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
					<EmailFieldDisplay email={email} />
				</div>
				<FormAlert message={saved ? "บันทึกสำเร็จ" : null} variant="success" />
				<FormAlert message={serverError} variant="destructive" />
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
