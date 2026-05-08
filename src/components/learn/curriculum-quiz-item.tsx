import Link from "next/link";
import { Check, Question } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

const ITEM_CLASS = cn(
	"flex w-full items-center gap-2.5 rounded-nav px-2.5 py-2 text-left text-uism transition-colors",
	"text-foreground hover:bg-muted",
);

interface CurriculumQuizItemProps {
	courseSlug: string;
	quizId: string;
	/** undefined = not attempted, true = passed, false = failed (latest attempt) */
	passed: boolean | undefined;
	onNavigate?: () => void;
}

export function CurriculumQuizItem({
	courseSlug,
	quizId,
	passed,
	onNavigate,
}: CurriculumQuizItemProps) {
	return (
		<Link
			href={`/learn/${courseSlug}/quiz/${quizId}`}
			className={ITEM_CLASS}
			onClick={onNavigate}
			prefetch
			scroll={false}
		>
			{passed === true ? <CheckCircleIcon /> : <QuizIcon />}
			<span className="flex-1 truncate">
				แบบทดสอบ
				{passed === false ? (
					<span className="ml-2 text-caption text-destructive-foreground">
						ลองอีกครั้ง
					</span>
				) : null}
			</span>
		</Link>
	);
}

function CheckCircleIcon() {
	return (
		<div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-success text-white">
			<Check size={14} weight="bold" />
		</div>
	);
}

function QuizIcon() {
	return (
		<div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border-strong bg-card">
			<Question size={12} className="text-foreground-subtle" />
		</div>
	);
}
