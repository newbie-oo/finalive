"use client";

import * as React from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
	invalid?: boolean;
	showStrength?: boolean;
};

function calculateStrength(value: string): { score: number; color: string } {
	let score = 0;
	if (value.length >= 8) score++;
	if (/\d/.test(value)) score++;
	if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) score++;
	if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;

	const colors = [
		"bg-(--foreground-subtle)",
		"bg-red-500",
		"bg-orange-500",
		"bg-yellow-500",
		"bg-green-500",
	];
	return { score, color: (colors[score] ?? "bg-(--border)") as string };
}

export const PasswordInput = React.forwardRef<
	HTMLInputElement,
	PasswordInputProps
>(function PasswordInput(
	{ className, invalid, showStrength, value, onChange, ...props },
	ref,
) {
	const [showPassword, setShowPassword] = React.useState(false);
	const [internalValue, setInternalValue] = React.useState("");

	const isControlled = value !== undefined;
	const currentValue = isControlled ? String(value) : internalValue;
	const { score, color } = calculateStrength(currentValue);

	const handleChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (!isControlled) {
				setInternalValue(e.target.value);
			}
			onChange?.(e);
		},
		[isControlled, onChange],
	);

	return (
		<div className={cn("space-y-2", className)}>
			<div className="relative">
				<Input
					ref={ref}
					type={showPassword ? "text" : "password"}
					invalid={invalid}
					className="pr-10"
					value={isControlled ? value : internalValue}
					onChange={handleChange}
					{...props}
				/>
				<button
					type="button"
					onClick={() => setShowPassword((v) => !v)}
					className="absolute inset-y-0 right-0 flex items-center px-3 text-(--foreground-muted) transition-colors hover:text-(--foreground)"
					tabIndex={-1}
					aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
				>
					{showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
				</button>
			</div>
			{showStrength && (
				<div className="flex gap-1" aria-label="ความแข็งแกร่งของรหัสผ่าน">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={i}
							className={cn(
								"h-1 flex-1 rounded-full transition-colors duration-200",
								i < score ? color : "bg-(--border)",
							)}
						/>
					))}
				</div>
			)}
		</div>
	);
});
