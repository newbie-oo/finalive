import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { Separator } from "@/components/ui/separator";
import { formatDurationMinutes } from "@/lib/format";

export interface UpNextListItem {
	courseSlug: string;
	courseTitle: string;
	coverImageUrl: string | null;
	lessonId: string;
	lessonTitle: string;
	durationSeconds: number | null;
}

interface UpNextListProps {
	items: UpNextListItem[];
}

/**
 * Cross-course "what's next" panel. Each row deeplinks straight to the
 * specific next-incomplete lesson — students don't have to first land on
 * the course page and figure out which lesson resumes their progress.
 * Returns null when nothing is in progress so the dashboard can drop it
 * in unconditionally.
 */
export function UpNextList({ items }: UpNextListProps) {
	if (items.length === 0) return null;

	return (
		<div className="rounded-card border border-border bg-card">
			{items.map((item, idx) => (
				<div key={`${item.courseSlug}-${item.lessonId}`}>
					<div className="flex items-center gap-4 px-5 py-4">
						<div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-input bg-muted">
							{item.coverImageUrl ? (
								<Image
									src={item.coverImageUrl}
									alt=""
									fill
									sizes="40px"
									className="object-cover"
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center bg-linear-to-br from-hero-from to-hero-to text-white">
									<span className="text-h4 font-semibold">
										{item.courseTitle.trim().charAt(0).toUpperCase()}
									</span>
								</div>
							)}
						</div>
						<div className="min-w-0 flex-1">
							<div className="text-uism text-muted-foreground line-clamp-1">
								{item.courseTitle}
							</div>
							<div className="text-ui font-semibold text-foreground line-clamp-1">
								{item.lessonTitle}
							</div>
							<div className="mt-0.5 text-caption text-muted-foreground">
								{formatDurationMinutes(item.durationSeconds)}
							</div>
						</div>
						<Link
							href={`/learn/${item.courseSlug}/${item.lessonId}`}
							aria-label={`เริ่มเรียนบทถัดไปของ ${item.courseTitle}`}
							className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-nav px-3 text-uism font-semibold text-primary transition-colors hover:bg-muted"
						>
							เริ่มเรียน
							<ArrowRight size={14} weight="bold" />
						</Link>
					</div>
					{idx < items.length - 1 && <Separator />}
				</div>
			))}
		</div>
	);
}
