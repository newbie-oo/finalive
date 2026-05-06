import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ToasterProvider } from "@/components/providers/toaster-provider";
import { CookieBanner } from "@/components/layouts/cookie-banner";

const plexThai = IBM_Plex_Sans_Thai({
	subsets: ["thai", "latin"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-plex-thai",
	display: "swap",
});

const geistSans = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
	display: "swap",
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-geist-mono",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Finalive — เรียนวิเคราะห์การเงินกับ creator ไทย",
	description:
		"คอร์สออนไลน์สำหรับคนทำงานสายการเงิน นักวิเคราะห์ และผู้สนใจลงทุน เรียนจบได้ใบประกาศที่ตรวจสอบออนไลน์ได้",
	openGraph: {
		type: "website",
		locale: "th_TH",
		siteName: "Finalive",
		title: "Finalive — เรียนวิเคราะห์การเงินกับ creator ไทย",
		description:
			"คอร์สออนไลน์สำหรับคนทำงานสายการเงิน นักวิเคราะห์ และผู้สนใจลงทุน เรียนจบได้ใบประกาศที่ตรวจสอบออนไลน์ได้",
	},
	twitter: {
		card: "summary_large_image",
		title: "Finalive — เรียนวิเคราะห์การเงินกับ creator ไทย",
		description: "คอร์สออนไลน์สำหรับคนทำงานสายการเงิน นักวิเคราะห์ และผู้สนใจลงทุน",
	},
	icons: {
		icon: [{ url: "/logo.png", type: "image/png", sizes: "625x625" }],
		apple: [{ url: "/logo.png", type: "image/png", sizes: "625x625" }],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="th"
			suppressHydrationWarning
			className={cn(
				"h-full",
				plexThai.variable,
				geistSans.variable,
				geistMono.variable,
				"font-sans",
			)}
		>
			<body className="min-h-full flex flex-col bg-background text-foreground">
				<ThemeProvider>
					<QueryProvider>
						{children}
						<CookieBanner />
						<ToasterProvider />
					</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
