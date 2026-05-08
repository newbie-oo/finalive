import Image from "next/image";
import Link from "next/link";
import { Play } from "@phosphor-icons/react/dist/ssr";

interface CourseHeroPosterProps {
	title: string;
	coverImageUrl: string | null;
	/** Deep link to the first previewable lesson, or null when none exists. */
	previewHref: string | null;
}

/**
 * Course-detail hero poster. Renders the course cover (or a gradient
 * fallback bearing the first letter of the title) and — when a previewable
 * lesson exists — overlays a large play button + "ดูตัวอย่าง" badge that
 * links to the preview route. Clicking the poster navigates to the
 * preview-lesson page rather than swapping to an inline player; the
 * preview page already owns the HLS player + signed-token plumbing.
 */
export function CourseHeroPoster({
	title,
	coverImageUrl,
	previewHref,
}: CourseHeroPosterProps) {
	const surface = (
		<div className="relative aspect-video w-full overflow-hidden bg-muted">
			{coverImageUrl ? (
				<Image
					src={coverImageUrl}
					alt={title}
					fill
					sizes="(max-width: 1024px) 100vw, 720px"
					className="object-cover"
					priority
				/>
			) : (
				<div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-hero-from to-hero-to">
					<span className="text-display font-semibold tracking-tight text-white">
						{title.trim().charAt(0).toUpperCase()}
					</span>
				</div>
			)}
			{previewHref && (
				<>
					{/* Subtle scrim so the play button stays legible over busy
					    cover photos. */}
					<div
						aria-hidden
						className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent"
					/>
					<div className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-foreground shadow-(--shadow-lg) transition-transform duration-200 group-hover:scale-105">
						<Play size={26} weight="fill" />
					</div>
					<span className="absolute top-4 left-4 rounded-pill bg-black/60 px-3 py-1 text-caption font-semibold text-white backdrop-blur-md">
						ดูตัวอย่าง
					</span>
				</>
			)}
		</div>
	);

	if (!previewHref) return surface;

	return (
		<Link
			href={previewHref}
			aria-label={`ดูตัวอย่างคอร์ส ${title}`}
			className="group relative block overflow-hidden rounded-radius-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
		>
			{surface}
		</Link>
	);
}
