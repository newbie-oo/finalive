"use client";

import { Keyboard } from "@phosphor-icons/react/dist/ssr";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KbdShortcut } from "@/components/ui/kbd";

interface Shortcut {
	keys: ReadonlyArray<string>;
	label: string;
}

const SHORTCUTS: ReadonlyArray<Shortcut> = [
	{ keys: ["A"], label: "ยอมรับสลิปที่เลือก" },
	{ keys: ["R"], label: "ปฏิเสธสลิปที่เลือก" },
	{ keys: ["S"], label: "ข้ามไปสลิปถัดไป" },
	{ keys: ["J"], label: "เลือกสลิปถัดไป" },
	{ keys: ["K"], label: "เลือกสลิปก่อนหน้า" },
	{ keys: ["Esc"], label: "ปิดรายละเอียด" },
	{ keys: ["?"], label: "เปิดหน้าต่างคีย์ลัด" },
];

/**
 * Reference popover for the slip-review keyboard shortcuts. The header
 * already shows the three primary keys (A / R / S) inline; admins who
 * want the full set click "คีย์ลัด" to open this dialog. Pure presentation —
 * the actual key handlers live with the queue.
 */
export function SlipShortcutsHelp() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="ghost" size="sm">
					<Keyboard size={16} weight="regular" /> คีย์ลัด
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>คีย์ลัดบนหน้าตรวจสลิป</DialogTitle>
					<DialogDescription>
						ใช้คีย์ลัดเพื่อตรวจสลิปได้เร็วขึ้น โดยไม่ต้องเลื่อนเมาส์
					</DialogDescription>
				</DialogHeader>
				<ul className="mt-2 grid gap-3">
					{SHORTCUTS.map((shortcut) => (
						<li
							key={shortcut.keys.join("+")}
							className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0"
						>
							<span className="text-body text-foreground">
								{shortcut.label}
							</span>
							<KbdShortcut keys={shortcut.keys} />
						</li>
					))}
				</ul>
			</DialogContent>
		</Dialog>
	);
}
