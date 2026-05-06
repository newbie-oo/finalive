import {
	CheckCircle,
	XCircle,
	Play,
	Certificate,
} from "@phosphor-icons/react/dist/ssr";

export function getActivityIcon(type: string) {
	switch (type) {
		case "lesson_complete":
			return (
				<CheckCircle size={18} weight="fill" className="text-(--primary)" />
			);
		case "quiz_pass":
			return (
				<CheckCircle size={18} weight="fill" className="text-(--success)" />
			);
		case "quiz_fail":
			return (
				<XCircle size={18} weight="fill" className="text-(--destructive)" />
			);
		case "course_complete":
			return (
				<Certificate size={18} weight="fill" className="text-(--accent)" />
			);
		default:
			return <Play size={18} weight="fill" className="text-(--primary)" />;
	}
}

export function getActivityBadge(type: string): string | null {
	switch (type) {
		case "lesson_complete":
			return "จบบทเรียน";
		case "quiz_pass":
			return "สอบผ่าน";
		case "quiz_fail":
			return "สอบไม่ผ่าน";
		case "course_complete":
			return "เรียนจบ";
		default:
			return null;
	}
}
