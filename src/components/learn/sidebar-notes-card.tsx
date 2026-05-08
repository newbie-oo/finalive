"use client";

import { NotePencil } from "@phosphor-icons/react/dist/ssr";
import { useSession } from "@/lib/auth-client";
import { getNotePreview } from "@/lib/note-preview";

interface SidebarNotesCardProps {
	lessonId: string;
}

export function SidebarNotesCard({ lessonId }: SidebarNotesCardProps) {
	const { data: session } = useSession();
	const userId = session?.user?.id ?? "";
	const preview = getNotePreview(userId, lessonId);

	if (!preview) return null;

	return (
		<div className="mt-4 rounded-xl border border-primary/20 bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-4">
			<div className="mb-2 flex items-center gap-2">
				<NotePencil size={16} className="text-primary" />
				<span className="text-uism font-semibold text-foreground">
					โน้ตของฉัน
				</span>
			</div>
			<p className="text-caption leading-relaxed text-muted-foreground">
				{preview}
			</p>
		</div>
	);
}
