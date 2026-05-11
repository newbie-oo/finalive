import {
	CheckCircle,
	XCircle,
	Play,
	Certificate,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactElement } from "react";

const ACTIVITY_ICON_MAP: Record<string, ReactElement> = {
	lesson_complete: (
		<CheckCircle size={18} weight="fill" className="text-primary" />
	),
	quiz_pass: (
		<CheckCircle size={18} weight="fill" className="text-success" />
	),
	quiz_fail: (
		<XCircle size={18} weight="fill" className="text-destructive" />
	),
	course_complete: (
		<Certificate size={18} weight="fill" className="text-accent" />
	),
};

const ACTIVITY_BADGE_MAP: Record<string, string> = {
	lesson_complete: "จบบทเรียน",
	quiz_pass: "สอบผ่าน",
	quiz_fail: "สอบไม่ผ่าน",
	course_complete: "เรียนจบ",
};

export function getActivityIcon(type: string): ReactElement {
	return ACTIVITY_ICON_MAP[type] ?? (
		<Play size={18} weight="fill" className="text-primary" />
	);
}

export function getActivityBadge(type: string): string | null {
	return ACTIVITY_BADGE_MAP[type] ?? null;
}
