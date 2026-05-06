"use client";

import * as React from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
	invalid?: boolean;
	showStrength?: boolean;
	icon?: React.ReactNode;
};

function calculateStrength(value: string): {
	score: number;
	barColor: string;
	textColor: string;
	label: string;
} {
	let score = 0;
	if (value.length >= 8) score++;
	if (/\d/.test(value)) score++;
	if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) score++;
	if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;

	const styles = [
		{
			bar: "bg-(--foreground-subtle)",
			text: "text-(--foreground-subtle)",
			label: "อ่อนแอ",
		},
		{ bar: "bg-red-500", text: "text-red-500", label: "อ่อน" },
		{ bar: "bg-orange-500", text: "text-orange-500", label: "ปานกลาง" },
		{ bar: "bg-yellow-500", text: "text-yellow-500", label: "ดี" },
		{ bar: "bg-green-500", text: "text-green-500", label: "ดีมาก" },
	] as const;
	const clampedScore = Math.min(Math.max(score, 0), 4);
	const style = styles[clampedScore] ?? styles[0];
	return {
		score,
		barColor: style.bar,
		textColor: style.text,
		label: style.label,
	};
}

export const PasswordInput = React.forwardRef<
	HTMLInputElement,
	PasswordInputProps
>(function PasswordInput(
	{ className, invalid, showStrength, icon, value, onChange, ...props },
	ref,
) {
	const [showPassword, setShowPassword] = React.useState(false);
	const [internalValue, setInternalValue] = React.useState("");

	const isControlled = value !== undefined;
	const currentValue = isControlled ? String(value) : internalValue;
	const { score, barColor, textColor, label } = calculateStrength(currentValue);

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
				{icon && (
					<div className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-(--foreground-muted)">
						{icon}
					</div>
				)}
				<Input
					ref={ref}
					type={showPassword ? "text" : "password"}
					invalid={invalid}
					className={cn("pr-10", icon && "pl-10")}
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
				<div
					className="flex items-center gap-2"
					aria-label="ความแข็งแกร่งของรหัสผ่าน"
				>
					<div className="flex flex-1 gap-1">
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i}
								className={cn(
									"h-1 flex-1 rounded-full transition-colors duration-200",
									i < score ? barColor : "bg-(--border)",
								)}
							/>
						))}
					</div>
					{currentValue.length > 0 && (
						<span className={cn("text-xs font-medium", textColor)}>
							{label}
						</span>
					)}
				</div>
			)}
		</div>
	);
});
