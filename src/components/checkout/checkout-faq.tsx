"use client";

import { CaretRight } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";

interface FaqItem {
	question: string;
	answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
	{
		question: "ตรวจสอบสลิปนานแค่ไหน?",
		answer:
			"โดยปกติภายใน 1-2 ชั่วโมงในเวลาทำการ (9:00-22:00) นอกเวลาดังกล่าวอาจช้ากว่าปกติ",
	},
	{
		question: "ถ้าโอนผิดยอดทำอย่างไร?",
		answer: "ทีมงานจะติดต่อกลับทางอีเมลพร้อมรายละเอียดการแก้ไขภายใน 24 ชม.",
	},
	{
		question: "ขอใบเสร็จได้ไหม?",
		answer: "ได้ — ใบเสร็จและใบกำกับภาษีจะส่งทางอีเมลพร้อมการเปิดสิทธิ์เรียน",
	},
];

export function CheckoutFaq() {
	return (
		<Card className="mt-8 p-6">
			<div className="text-ui mb-4 font-semibold text-foreground">
				คำถามที่พบบ่อย
			</div>
			<div className="flex flex-col gap-3">
				{FAQ_ITEMS.map((item, i) => (
					<FaqEntry key={i} {...item} isLast={i === FAQ_ITEMS.length - 1} />
				))}
			</div>
		</Card>
	);
}

function FaqEntry({ question, answer, isLast }: FaqItem & { isLast: boolean }) {
	return (
		<details className={isLast ? "" : "border-b border-border pb-3"}>
			<summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-foreground">
				{question}
				<CaretRight size={16} className="text-foreground-subtle shrink-0" />
			</summary>
			<p className="text-uism text-muted-foreground pt-2 text-pretty">
				{answer}
			</p>
		</details>
	);
}
