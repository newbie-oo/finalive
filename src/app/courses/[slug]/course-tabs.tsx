"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Check, Play, LockSimple, YoutubeLogo } from "@phosphor-icons/react";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { LessonAccessBadge } from "@/components/course/lesson-access-badge";
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
}: {
	lesson: CurriculumLesson;
	courseSlug: string;
}) {
	const playable = lesson.isPreview || lesson.isFree;
	const Icon = playable ? Play : LockSimple;
	const inner = (
		<div className="flex items-center justify-between border-b border-(--border) px-4 py-3 text-body last:border-b-0">
			<span className="flex items-center gap-3">
				<Icon
					size={16}
					weight={playable ? "fill" : "regular"}
					className={
						playable ? "text-(--primary)" : "text-(--foreground-subtle)"
					}
				/>
				<span
					className={
						playable ? "text-(--foreground)" : "text-(--foreground-muted)"
					}
				>
					{lesson.title}
				</span>
				<LessonAccessBadge
					isPreview={lesson.isPreview}
					isFree={lesson.isFree}
				/>
			</span>
			<span className="num text-uism text-(--foreground-muted)">
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
				{inner}
			</Link>
		);
	}
	return <div>{inner}</div>;
}

function LearningOutcomes({ outcomes }: { outcomes: string[] }) {
	return (
		<section className="py-12 md:py-16">
			<div className="mx-auto max-w-[1200px] px-6">
				<h2 className="text-h2 mb-6">สิ่งที่คุณจะได้เรียนรู้</h2>
				<div className="grid gap-4 sm:grid-cols-2">
					{outcomes.map((outcome) => (
						<div
							key={outcome}
							className="flex items-start gap-3 rounded-card border border-(--border) bg-(--surface) p-4"
						>
							<Check
								size={20}
								weight="bold"
								className="mt-0.5 shrink-0 text-(--success)"
							/>
							<span className="text-body text-(--foreground)">{outcome}</span>
						</div>
					))}
				</div>
			</div>
		</section>
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
			<p className="mb-4 text-body text-(--foreground-muted)">
				<span className="num">{curriculum.length}</span> โมดูล ·
				<span className="num"> {totalLessons}</span> บทเรียน · เวลาเรียนรวม{" "}
				{formatDuration(totalDuration)}
			</p>
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
							{m.lessons.map((l) => (
								<LessonRow key={l.id} lesson={l} courseSlug={courseSlug} />
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
		<>
			<LearningOutcomes outcomes={learningOutcomes ?? DEFAULT_OUTCOMES} />

			<section ref={instructorRef} id="instructor" className="py-12 md:py-16">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
						<div>
							{/* Tab nav */}
							<div className="mb-6 flex gap-6 border-b border-(--border)">
								{TABS.map((tab) => (
									<button
										key={tab.id}
										type="button"
										onClick={() => setActiveTab(tab.id)}
										className={`relative pb-3 text-ui font-medium transition-colors ${
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
								<CurriculumTab
									curriculum={curriculum}
									courseSlug={courseSlug}
									totalLessons={totalLessons}
									totalDuration={totalDuration}
								/>
							)}
							{activeTab === "instructor" && <InstructorTab />}
							{activeTab === "faq" && <FaqTab />}
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
