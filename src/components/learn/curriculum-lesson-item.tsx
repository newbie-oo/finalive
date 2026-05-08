import Link from "next/link";
import { Check, Play, Question, LockSimple } from "@phosphor-icons/react/dist/ssr";
import { LessonAccessBadge } from "@/components/course/lesson-access-badge";
import { formatDuration } from "@/lib/format";

const ITEM_BASE =
	"flex w-full items-center gap-2.5 rounded-nav px-2.5 py-2.5 text-left text-uism transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const ITEM_ACTIVE =
	"bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] font-semibold text-primary border-l-[3px] border-primary";
const ITEM_LOCKED = "cursor-not-allowed text-foreground-subtle";
const ITEM_DEFAULT = "text-foreground hover:bg-muted";

interface StatusIconProps {
	status: string;
	locked: boolean;
	isQuiz?: boolean;
}

function StatusIcon({ status, locked, isQuiz }: StatusIconProps) {
	if (locked) {
		return (
			<div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border-strong">
				<LockSimple size={12} className="text-foreground-subtle" />
			</div>
		);
	}
	if (status === "completed") {
		return (
			<div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-success text-white">
				<Check size={14} weight="bold" />
			</div>
		);
	}
	if (status === "in_progress") {
		return (
			<div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary text-white">
				<Play size={10} weight="fill" />
			</div>
		);
	}
	if (isQuiz) {
		return (
			<div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border-strong bg-card">
				<Question size={12} className="text-foreground-subtle" />
			</div>
		);
	}
	return (
		<div className="h-[22px] w-[22px] rounded-full border border-border-strong bg-card" />
	);
}

interface CurriculumLessonItemProps {
	courseSlug: string;
	lessonId: string;
	title: string;
	durationSeconds: number | null;
	isPreview: boolean;
	isFree: boolean;
	status: string;
	locked: boolean;
	isActive: boolean;
	onNavigate?: () => void;
}

export function CurriculumLessonItem({
	courseSlug,
	lessonId,
	title,
	durationSeconds,
	isPreview,
	isFree,
	status,
	locked,
	isActive,
	onNavigate,
}: CurriculumLessonItemProps) {
	const stateClass = isActive
		? ITEM_ACTIVE
		: locked
			? ITEM_LOCKED
			: ITEM_DEFAULT;

	const inner = (
		<>
			<StatusIcon status={status} locked={locked} />
			<span className="flex-1 truncate">
				{locked ? <span className="sr-only">ล็อก: </span> : null}
				{title}
			</span>
			<LessonAccessBadge isPreview={isPreview} isFree={isFree} size="sm" />
			{durationSeconds ? (
				<span className="num text-caption text-foreground-subtle">
					{formatDuration(durationSeconds, "")}
				</span>
			) : null}
		</>
	);

	if (locked) {
		return (
			<button
				type="button"
				aria-disabled="true"
				title="ลงทะเบียนคอร์สเพื่อปลดล็อกบทเรียนนี้"
				onClick={(e) => e.preventDefault()}
				className={`${ITEM_BASE} ${stateClass}`}
			>
				{inner}
			</button>
		);
	}

	return (
		<Link
			href={`/learn/${courseSlug}/${lessonId}`}
			className={`${ITEM_BASE} ${stateClass}`}
			aria-current={isActive ? "page" : undefined}
			onClick={onNavigate}
			prefetch
			scroll={false}
		>
			{inner}
		</Link>
	);
}
