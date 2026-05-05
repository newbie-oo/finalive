"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
	Check,
	Play,
	LockSimple,
	YoutubeLogo,
	Video,
	Certificate,
	ChatCircle,
	Clock,
	ArrowRight,
} from "@phosphor-icons/react";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { formatDuration, formatDurationMinutes } from "@/lib/format";
import type { CurriculumModule, CurriculumLesson } from "@/server/repos/course";

const DEFAULT_OUTCOMES = [
	"เข้าใจหลักการลงทุนแบบ Value Investing จากศูนย์",
	"วิเคราะห์งบการเงินและประเมินมูลค่าหุ้นได้ด้วยตนเอง",
	"สร้างพอร์ตลงทุนที่เหมาะสมกับความเสี่ยงของตัวเอง",
	"ใช้เครื่องมือและตัวชี้วัดทางเทคนิคประกอบการตัดสินใจ",
	"วางแผนภาษีและบริหารความมั่งคั่งระยะยาว",
];

const FAQS = [
	{
		q: "คอร์สนี้เหมาะกับใคร?",
		a: "เหมาะสำหรับผู้เริ่มต้นลงทุน หรือผู้ที่ต้องการสร้างรากฐานการวิเคราะห์หุ้นอย่างเป็นระบบ ไม่จำเป็นต้องมีประสบการณ์มาก่อน",
	},
	{
		q: "ต้องมีพื้นฐานอะไรก่อนไหม?",
		a: "ไม่จำเป็นต้องมีพื้นฐานทางการเงิน คอร์สอธิบายตั้งแต่ศูนย์ พร้อมตัวอย่างและแบบฝึกหัดประกอบทุกบท",
	},
	{
		q: "ได้รับใบประกาศเมื่อไหร่?",
		a: "เมื่อเรียนครบทุกบทและทำแบบทดสอบจบบทผ่านเกณฑ์ ระบบจะออกใบประกาศให้อัตโนมัติทันที",
	},
	{
		q: "สามารถเรียนซ้ำได้ไหม?",
		a: "ได้ คอร์สนี้ให้สิทธิ์เรียนซ้ำได้ตลอดชีพ ไม่จำกัดจำนวนครั้ง",
	},
];

function LessonRow({
	lesson,
	courseSlug,
	lessonNumber,
}: {
	lesson: CurriculumLesson;
	courseSlug: string;
	lessonNumber: string;
}) {
	const playable = lesson.isPreview || lesson.isFree;

	const row = (
		<div className="flex items-center gap-3.5 border-t border-(--border) px-5 py-3.5">
			{playable ? (
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--primary)/10 text-(--primary)">
					<Play size={16} weight="fill" />
				</div>
			) : (
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--surface-muted) text-(--foreground-subtle)">
					<LockSimple size={16} />
				</div>
			)}
			<span className="num text-uism w-7 shrink-0 text-(--foreground-subtle)">
				{lessonNumber}
			</span>
			<span
				className={`text-ui flex-1 ${
					playable ? "text-(--foreground)" : "text-(--foreground-muted)"
				}`}
			>
				{lesson.title}
			</span>
			{lesson.isPreview && (
				<span className="shrink-0 rounded-full bg-(--primary)/10 px-2.5 py-0.5 text-[11px] font-medium text-(--primary)">
					Preview
				</span>
			)}
			<span className="num text-uism shrink-0 text-(--foreground-subtle)">
				{formatDurationMinutes(lesson.durationSeconds)}
			</span>
		</div>
	);

	if (playable) {
		return (
			<Link
				href={`/courses/${courseSlug}/preview/${lesson.id}`}
				className="block transition-colors hover:bg-(--surface-muted)"
			>
				{row}
			</Link>
		);
	}
	return <div>{row}</div>;
}

function LearningOutcomes({ outcomes }: { outcomes: string[] }) {
	return (
		<div className="mb-8 rounded-card border border-(--primary)/15 bg-(--surface-muted) p-6">
			<h3 className="text-h3 mb-4 font-semibold text-(--foreground)">
				สิ่งที่คุณจะได้เรียนรู้
			</h3>
			<div className="grid gap-3 sm:grid-cols-2">
				{outcomes.map((outcome) => (
					<div
						key={outcome}
						className="flex items-start gap-3 text-body text-(--foreground)"
					>
						<Check
							size={18}
							weight="bold"
							className="mt-0.5 shrink-0 text-(--primary)"
						/>
						<span>{outcome}</span>
					</div>
				))}
			</div>
		</div>
	);
}

function CurriculumTab({
	curriculum,
	courseSlug,
	totalLessons,
	totalDuration,
}: {
	curriculum: CurriculumModule[];
	courseSlug: string;
	totalLessons: number;
	totalDuration: number;
}) {
	return (
		<div>
			<div className="mb-4 flex items-end justify-between">
				<h3 className="text-h2 font-semibold text-(--foreground)">เนื้อหาคอร์ส</h3>
				<span className="text-uism text-(--foreground-muted)">
					<span className="num">{curriculum.length}</span> โมดูล ·{" "}
					<span className="num">{totalLessons}</span> บทเรียน ·{" "}
					<span className="num">{formatDuration(totalDuration)}</span>
				</span>
			</div>
			{curriculum.length === 0 ? (
				<p className="text-body text-(--foreground-muted)">ยังไม่มีเนื้อหา</p>
			) : (
				<Accordion>
					{curriculum.map((m, idx) => (
						<AccordionItem
							key={m.id}
							defaultOpen={idx === 0}
							header={
								<span className="flex w-full items-center justify-between">
									<span>
										{m.sortOrder}. {m.title}
									</span>
									<span className="text-uism text-(--foreground-muted)">
										<span className="num">{m.lessons.length}</span> บทเรียน
									</span>
								</span>
							}
						>
							{m.lessons.map((l, lIdx) => (
								<LessonRow
									key={l.id}
									lesson={l}
									courseSlug={courseSlug}
									lessonNumber={`${idx + 1}.${lIdx + 1}`}
								/>
							))}
						</AccordionItem>
					))}
				</Accordion>
			)}
		</div>
	);
}

function InstructorTab() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-[#6366F1] to-[#8B5CF6] text-h3 font-semibold text-white">
					อา
				</div>
				<div>
					<h3 className="text-h3 font-semibold text-(--foreground)">
						Arm Riley Quant
					</h3>
					<p className="text-body text-(--foreground-muted)">
						นักวิเคราะห์การลงทุน · CFA Charterholder
					</p>
				</div>
			</div>

			<p className="text-body text-(--foreground)">
				อาร์มมีประสบการณ์วิเคราะห์การลงทุนกว่า 10 ปี ในตลาดหุ้นไทยและต่างประเทศ
				พร้อมความเชี่ยวชาญในการวางแผนการเงินระยะยาวและการบริหารความเสี่ยง
				ผ่านการสอนมาแล้วกว่า 5,000 นักเรียนทั่วประเทศ
			</p>

			<div className="flex flex-wrap gap-4">
				<a
					href="https://www.youtube.com/@ArmRileyQuant"
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-2 rounded-[10px] bg-(--destructive) px-4 py-2.5 text-ui font-semibold text-white transition-colors hover:bg-[#B91C1C]"
				>
					<YoutubeLogo size={18} weight="fill" />
					ติดตามบน YouTube
				</a>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="rounded-card border border-(--border) bg-(--surface-muted) p-4 text-center">
					<div className="num text-h2 font-bold text-(--primary)">12</div>
					<div className="text-uism text-(--foreground-muted)">คอร์ส</div>
				</div>
				<div className="rounded-card border border-(--border) bg-(--surface-muted) p-4 text-center">
					<div className="num text-h2 font-bold text-(--primary)">5,000+</div>
					<div className="text-uism text-(--foreground-muted)">นักเรียน</div>
				</div>
			</div>
		</div>
	);
}

function FaqTab() {
	return (
		<Accordion>
			{FAQS.map((faq) => (
				<AccordionItem key={faq.q} header={faq.q}>
					<p className="px-4 py-3 text-body text-(--foreground-muted)">
						{faq.a}
					</p>
				</AccordionItem>
			))}
		</Accordion>
	);
}

function InstructorCard() {
	return (
		<div className="mb-6 rounded-card border border-(--border) bg-(--surface) p-6">
			<div className="mb-3 text-uism uppercase tracking-wider text-(--foreground-muted)">
				ผู้สอน
			</div>
			<div className="mb-4 flex items-center gap-3.5">
				<div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-[#6366F1] to-[#8B5CF6] text-h4 font-semibold text-white">
					อา
				</div>
				<div>
					<div className="text-h4 font-semibold text-(--foreground)">
						อาร์ม ริลีย์
					</div>
					<div className="text-caption text-(--foreground-muted)">
						CFA · อดีต VP Investment
					</div>
				</div>
			</div>
			<p className="mb-4 text-uism text-pretty text-(--foreground-muted)">
				อาจารย์อาร์มเคยทำงานด้านการลงทุนกับกองทุนใหญ่ในไทยและสิงคโปร์ ปัจจุบันเป็น
				independent analyst
			</p>
			<Button variant="secondary" className="w-full">
				ดูคอร์สทั้งหมดของผู้สอน
				<ArrowRight size={14} />
			</Button>
		</div>
	);
}

function CourseContentsCard({
	totalLessons,
	totalDuration,
}: {
	totalLessons: number;
	totalDuration: number;
}) {
	const items = [
		{
			icon: Video,
			label: `${totalLessons} บทเรียน HD`,
			sub: `รวม ${formatDuration(totalDuration)}`,
		},
		{ icon: Certificate, label: "ใบประกาศ", sub: "เมื่อจบคอร์ส" },
		{ icon: ChatCircle, label: "Q&A กับผู้สอน", sub: "บน Discord" },
		{ icon: Clock, label: "เรียนตลอดชีพ", sub: "อัปเดตเนื้อหาฟรี" },
	];

	return (
		<div className="rounded-card border border-(--border) bg-(--surface) p-6">
			<div className="mb-4 text-ui font-semibold text-(--foreground)">
				คอร์สนี้ประกอบด้วย
			</div>
			<div className="flex flex-col gap-3">
				{items.map(({ icon: Icon, label, sub }, i) => (
					<div key={i} className="flex items-center gap-3">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--surface-muted) text-(--primary)">
							<Icon size={18} />
						</div>
						<div>
							<div className="text-ui font-medium text-(--foreground)">
								{label}
							</div>
							<div className="text-caption text-(--foreground-muted)">
								{sub}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

const TABS = [
	{ id: "curriculum", label: "เนื้อหา" },
	{ id: "instructor", label: "ผู้สอน" },
	{ id: "faq", label: "FAQ" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export interface CourseTabsProps {
	curriculum: CurriculumModule[];
	courseSlug: string;
	totalLessons: number;
	totalDuration: number;
	learningOutcomes?: string[];
}

export function CourseTabs({
	curriculum,
	courseSlug,
	totalLessons,
	totalDuration,
	learningOutcomes,
}: CourseTabsProps) {
	const [activeTab, setActiveTab] = useState<TabId>(() => {
		if (
			typeof window !== "undefined" &&
			window.location.hash === "#instructor"
		) {
			return "instructor";
		}
		return "curriculum";
	});
	const instructorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (window.location.hash === "#instructor") {
			instructorRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	}, []);

	return (
		<section ref={instructorRef} id="instructor" className="py-12 md:py-16">
			<div className="mx-auto max-w-[1200px] px-6">
				<div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
					{/* Left column — tabs */}
					<div>
						{/* Tab nav */}
						<div className="mb-8 flex gap-1 border-b border-(--border)">
							{TABS.map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveTab(tab.id)}
									className={`relative px-3 pb-3 pt-1 text-ui font-medium transition-colors ${
										activeTab === tab.id
											? "text-(--foreground)"
											: "text-(--foreground-muted) hover:text-(--foreground)"
									}`}
									aria-selected={activeTab === tab.id}
									role="tab"
								>
									{tab.label}
									{activeTab === tab.id && (
										<span className="absolute inset-x-0 -bottom-px h-0.5 bg-(--primary)" />
									)}
								</button>
							))}
						</div>

						{/* Tab panels */}
						{activeTab === "curriculum" && (
							<>
								<LearningOutcomes
									outcomes={learningOutcomes ?? DEFAULT_OUTCOMES}
								/>
								<CurriculumTab
									curriculum={curriculum}
									courseSlug={courseSlug}
									totalLessons={totalLessons}
									totalDuration={totalDuration}
								/>
							</>
						)}
						{activeTab === "instructor" && <InstructorTab />}
						{activeTab === "faq" && <FaqTab />}
					</div>

					{/* Right column — instructor + contents */}
					<div>
						<InstructorCard />
						<CourseContentsCard
							totalLessons={totalLessons}
							totalDuration={totalDuration}
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
