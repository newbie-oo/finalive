import { cn } from "@/lib/utils";

interface AuthSplitLayoutProps {
	left: React.ReactNode;
	right?: React.ReactNode;
	gradient?: string;
	className?: string;
}

export function AuthSplitLayout({
	left,
	right,
	gradient = "linear-gradient(135deg, #4F46E5, #7C3AED)",
	className,
}: AuthSplitLayoutProps) {
	return (
		<div className={cn("flex min-h-full", className)}>
			<div className="flex w-full flex-col items-center justify-center bg-(--surface) px-6 py-12 md:w-1/2 lg:w-[45%]">
				{left}
			</div>
			{right && (
				<div
					className="relative hidden flex-col justify-between p-12 text-white md:flex md:w-1/2 lg:w-[55%]"
					style={{ background: gradient }}
				>
					<svg
						className="absolute inset-0 opacity-10"
						width="100%"
						height="100%"
						aria-hidden
					>
						<defs>
							<pattern
								id="dots-auth"
								x="0"
								y="0"
								width="20"
								height="20"
								patternUnits="userSpaceOnUse"
							>
								<circle cx="2" cy="2" r="1" fill="white" />
							</pattern>
						</defs>
						<rect width="100%" height="100%" fill="url(#dots-auth)" />
					</svg>
					{right}
				</div>
			)}
		</div>
	);
}
