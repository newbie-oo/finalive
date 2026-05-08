import { YoutubeLogo } from "@phosphor-icons/react";

const YOUTUBE_URL = "https://www.youtube.com/@armrileyquant";

export function YoutubeHeaderLink() {
	return (
		<a
			href={YOUTUBE_URL}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="YouTube"
			className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
		>
			<YoutubeLogo size={18} weight="fill" />
		</a>
	);
}
