"use client";

import Link from "next/link";
import {
	ListChecks,
	Target,
	Clock,
	ArrowsClockwise,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface QuizBriefingProps {
	title: string;
	questionCount: number;
	passScorePct: number;
	/** Where the secondary 'back to lesson' link should point. */
	lessonHref: string;
	onStart: () => void;
}

/**
 * Shown before a student starts their first attempt of a quiz. Surfaces
 * the four facts that drive the decision to begin (count, pass mark,
 * estimated time, retry policy) so the active screen doesn't have to
 * re-explain them per question. Estimate is computed at ~1 minute per
 * question and rounded — close enough for a heads-up.
 */
export function QuizBriefing({
	title,
	questionCount,
	passScorePct,
	lessonHref,
	onStart,
}: QuizBriefingProps) {
	const estimatedMinutes = Math.max(1, Math.round(questionCount * 1));

	return (
		<Card className="mx-auto max-w-[560px] p-8">
			<h1 className="text-h2 mb-2">{title}</h1>
			<p className="mb-6 text-body text-muted-foreground">
				เตรียมตัวให้พร้อม — อ่านโจทย์อย่างละเอียดก่อนตอบ ระบบจะบันทึกคำตอบของคุณเมื่อกดส่งเท่านั้น
			</p>

			<dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<StatRow icon={<ListChecks size={18} weight="bold" />} label="จำนวนข้อ">
					<span className="num">{questionCount}</span> ข้อ
				</StatRow>
				<StatRow icon={<Target size={18} weight="bold" />} label="เกณฑ์ผ่าน">
					ผ่านที่ <span className="num">{passScorePct}</span>%
				</StatRow>
				<StatRow icon={<Clock size={18} weight="bold" />} label="ใช้เวลาโดยประมาณ">
					ประมาณ <span className="num">{estimatedMinutes}</span> นาที
				</StatRow>
				<StatRow icon={<ArrowsClockwise size={18} weight="bold" />} label="ทำซ้ำ">
					ทำได้ไม่จำกัด
				</StatRow>
			</dl>

			<div className="mt-7 flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
				<Button
					type="button"
					variant="accent"
					size="lg"
					onClick={onStart}
					className="w-full sm:w-auto"
				>
					เริ่มทำแบบทดสอบ
				</Button>
				<Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
					<Link href={lessonHref}>กลับไปบทเรียน</Link>
				</Button>
			</div>
		</Card>
	);
}

interface StatRowProps {
	icon: React.ReactNode;
	label: string;
	children: React.ReactNode;
}

function StatRow({ icon, label, children }: StatRowProps) {
	return (
		<div className="flex items-start gap-3 rounded-card border border-border bg-card p-3.5">
			<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-radius-button bg-primary/10 text-primary">
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<dt className="text-uism text-muted-foreground">{label}</dt>
				<dd className="text-ui font-semibold text-foreground">{children}</dd>
			</div>
		</div>
	);
}
