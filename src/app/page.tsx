import Link from "next/link";
import {
	ArrowRight,
	Books,
	CurrencyCircleDollar,
	GraduationCap,
	Quotes,
	ShieldCheck,
	BookOpen,
	Certificate,
	Play,
	VideoCamera,
	Translate,
	Trophy,
	ChartLine,
	ChartBar,
	TrendUp,
	FileText,
	Money,
	Globe,
	CaretRight,
	Star,
	Users,
} from "@phosphor-icons/react/dist/ssr";
import { PublicShell } from "@/components/layouts/public-shell";

const STEPS = [
	{
		n: "01",
		icon: Books,
		title: "เลือกคอร์ส",
		body: "เลือกคอร์สที่ตรงกับเป้าหมาย ดูตัวอย่างฟรีก่อนตัดสินใจ",
	},
	{
		n: "02",
		icon: CurrencyCircleDollar,
		title: "ชำระเงิน",
		body: "โอนผ่านธนาคารหรือ PromptPay อัปสลิป — ตรวจภายใน 24 ชม.",
	},
	{
		n: "03",
		icon: GraduationCap,
		title: "เริ่มเรียน",
		body: "เรียนได้ทุกอุปกรณ์ จบคอร์สรับใบประกาศที่ตรวจสอบออนไลน์",
	},
];

const FEATURES = [
	{
		icon: VideoCamera,
		title: "วิดีโอคุณภาพสูง",
		body: "สตรีมผ่าน HLS คมชัดทุกอุปกรณ์ ไม่มีโฆษณาคั่น เรียนได้ทั้งบนมือถือและคอมพิวเตอร์",
	},
	{
		icon: Translate,
		title: "เนื้อหาภาษาไทย",
		body: "อธิบายเป็นภาษาไทยละเอียดเข้าใจง่าย ไม่ต้องพึ่งคำบรรยายภาษาอังกฤษ อ่านงบการเงินได้จริง",
	},
	{
		icon: Trophy,
		title: "ใบประกาศนียบัตร",
		body: "รับใบประกาศที่ตรวจสอบออนไลน์ได้ด้วย SHA-256 แชร์ลง LinkedIn หรือโชว์ผลงานได้ทันที",
	},
];

const TESTIMONIALS = [
	{
		quote:
			"อาจารย์อธิบายเข้าใจง่ายมาก เริ่มจากพื้นฐานที่ไม่เคยรู้ จนตอนนี้อ่านงบบริษัทแล้วเข้าใจและกล้าตัดสินใจลงทุนเอง ไฟล์ Excel ที่แถมก็ใช้ทำงานจริงต่อได้เลย",
		name: "ณัฐกานต์ จิรพัฒน์",
		role: "นักวิเคราะห์การลงทุน",
		initials: "ณก",
	},
	{
		quote:
			"เนื้อหาละเอียดมาก ไม่ใช่แค่ทฤษฎี แต่มีตัวอย่างจริงจากตลาดหุ้นไทย ใบประกาศก็เอาไปโชว์ใน LinkedIn ได้เลย",
		name: "ปิยะวัฒน์ สุขสมบูรณ์",
		role: "Financial Analyst",
		initials: "ปส",
	},
	{
		quote:
			"ลงทุนมา 3 ปี ขาดทุนตลอด พอมาเรียนเข้าใจว่าตัวเองพลาดตรงไหน ตอนนี้พอร์ตกำไรแล้ว ขอบคุณอาจารย์อาร์มมากครับ",
		name: "ธนกร มหาชัย",
		role: "เจ้าของธุรกิจ SME",
		initials: "ธม",
	},
];

const CATEGORIES = [
	{
		label: "DCF & Valuation",
		icon: ChartLine,
		count: 8,
		color: "#4F46E5",
		bg: "#EEF2FF",
	},
	{
		label: "Excel & Modeling",
		icon: ChartBar,
		count: 6,
		color: "#10B981",
		bg: "#ECFDF5",
	},
	{
		label: "พื้นฐานการลงทุน",
		icon: TrendUp,
		count: 12,
		color: "#F97316",
		bg: "#FFF7ED",
	},
	{
		label: "บัญชี & งบการเงิน",
		icon: FileText,
		count: 5,
		color: "#8B5CF6",
		bg: "#F5F3FF",
	},
	{
		label: "การเงินส่วนบุคคล",
		icon: Money,
		count: 7,
		color: "#EC4899",
		bg: "#FDF2F8",
	},
	{
		label: "Crypto & Web3",
		icon: Globe,
		count: 3,
		color: "#0EA5E9",
		bg: "#F0F9FF",
	},
];

const LOGOS = ["SCB 10X", "KASIKORN", "BAY", "BLS", "FINNOMENA", "JITTA"];

export default function Home() {
	return (
		<PublicShell>
			{/* Hero */}
			<section className="mx-auto max-w-[1200px] px-6 py-16 md:py-24">
				<div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
					<div>
						<span className="mb-6 inline-flex items-center gap-2 rounded-full border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-uism text-(--foreground-muted)">
							<span
								className="h-2 w-2 rounded-full bg-(--primary)"
								aria-hidden
							/>
							คอร์สยอดนิยม: DCF Valuation ขั้นสูง — เปิดลงทะเบียนแล้ว
						</span>
						<h1 className="text-display text-(--foreground)">
							เรียนวิเคราะห์การเงิน
							<br />
							กับ <span className="text-(--primary)">creator ไทย</span>
							<br />
							เรียนจบ ได้ใบประกาศ
						</h1>
						<p className="mt-5 max-w-xl text-bodylg text-(--foreground-muted)">
							คอร์สสำหรับคนทำงานสายการเงิน นักวิเคราะห์ และผู้สนใจลงทุน
							เรียนผ่านวิดีโอที่อธิบายทีละขั้น พร้อมไฟล์ Excel ตัวอย่างจริง
							และสอบรับใบประกาศที่ตรวจสอบได้ออนไลน์
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<Link
								href="/courses"
								className="inline-flex h-12 items-center gap-2 rounded-full bg-(--accent) px-8 text-ui font-medium text-(--accent-fg) transition-colors hover:bg-(--accent-hover)"
							>
								ดูคอร์สทั้งหมด <ArrowRight size={16} weight="bold" />
							</Link>
							<Link
								href="/register"
								className="inline-flex h-12 items-center rounded-full border border-(--border) bg-(--surface-muted) px-8 text-ui font-medium text-(--foreground) transition-colors hover:bg-(--surface-sunken)"
							>
								ลงทะเบียนฟรี
							</Link>
						</div>

						{/* Trust row */}
						<div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
							<TrustStat value="12,500+" label="นักเรียนที่ลงทะเบียน" />
							<span
								className="hidden h-8 w-px bg-(--border) sm:block"
								aria-hidden
							/>
							<TrustStat value="41" label="คอร์สเปิดสอน" />
							<span
								className="hidden h-8 w-px bg-(--border) sm:block"
								aria-hidden
							/>
							<TrustStat value="180+" label="บทเรียน" />
						</div>
					</div>

					<HeroVisual />
				</div>
			</section>

			{/* Social Proof Bar */}
			<section className="border-y border-(--border) bg-(--surface) py-8">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="flex flex-col items-center gap-5 md:flex-row md:justify-center">
						<span
							className="text-uism text-(--foreground-subtle)"
							style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
						>
							เรียนรู้กับนักลงทุนและทีมงานจาก
						</span>
						<div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 md:gap-x-8">
							{LOGOS.map((logo) => (
								<span
									key={logo}
									className="text-uism font-semibold text-(--foreground-muted)"
									style={{
										textTransform: "uppercase",
										letterSpacing: "0.06em",
									}}
								>
									{logo}
								</span>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Featured Courses — Static */}
			<section className="bg-(--surface-muted) py-16 md:py-24">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="mb-8 flex flex-wrap items-end justify-between gap-3">
						<div>
							<Eyebrow>คอร์สแนะนำ</Eyebrow>
							<h2 className="mt-2 text-h2">เริ่มต้นจากคอร์สยอดนิยม</h2>
						</div>
						<Link
							href="/courses"
							className="inline-flex items-center gap-1.5 text-ui font-medium text-(--primary) hover:underline"
						>
							ดูทั้งหมด <ArrowRight size={14} weight="bold" />
						</Link>
					</div>
					<ul className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
						<li className="h-full">
							<StaticCourseCard
								slug="dcf-valuation-advanced"
								title="DCF Valuation ขั้นสูง"
								summary="เรียนรู้การประเมินมูลค่าธุรกิจด้วย Discounted Cash Flow แบบมืออาชีพ พร้อมไฟล์ Excel ตัวอย่าง"
								price="3,990"
								students="2,340"
								tag="ขายดี"
								tagTone="warning"
							/>
						</li>
						<li className="h-full">
							<StaticCourseCard
								slug="stock-thai-30-days"
								title="หุ้นไทย 30 วัน"
								summary="พื้นฐานการลงทุนในตลาดหลักทรัพย์ไทย ตั้งแต่ศัพท์เทคนิคจนถึงการอ่านงบการเงิน"
								price="ฟรี"
								students="5,120"
								tag="ฟรี"
								tagTone="success"
							/>
						</li>
						<li className="h-full">
							<StaticCourseCard
								slug="excel-financial-modeling"
								title="Excel Financial Modeling"
								summary="สร้างโมเดลการเงินด้วย Excel ตั้งแต่พื้นฐานจนถึงระดับมืออาชีพ ใช้งานจริงได้ทันที"
								price="2,990"
								students="1,890"
							/>
						</li>
					</ul>
				</div>
			</section>

			{/* Categories */}
			<section className="py-16 md:py-24">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="mb-12 text-center">
						<Eyebrow>หมวดหมู่</Eyebrow>
						<h2 className="mt-2 text-h2">ค้นหาตามหมวดหมู่</h2>
						<p className="mt-2 text-body text-(--foreground-muted)">
							เลือกเรียนตามความสนใจ — จากพื้นฐานสู่ระดับมืออาชีพ
						</p>
					</div>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{CATEGORIES.map((cat) => {
							const Ic = cat.icon;
							return (
								<Link
									key={cat.label}
									href={`/courses?category=${encodeURIComponent(cat.label)}`}
									className="group flex items-center gap-4 rounded-card border border-(--border) bg-(--surface) p-5 transition-colors hover:border-(--primary)"
								>
									<div
										className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-card"
										style={{ backgroundColor: cat.bg, color: cat.color }}
									>
										<Ic size={24} weight="bold" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="text-ui font-semibold text-(--foreground)">
											{cat.label}
										</div>
										<div className="text-caption text-(--foreground-muted)">
											{cat.count} คอร์ส
										</div>
									</div>
									<CaretRight
										size={16}
										weight="bold"
										className="flex-shrink-0 text-(--foreground-subtle) transition-colors group-hover:text-(--primary)"
									/>
								</Link>
							);
						})}
					</div>
				</div>
			</section>

			{/* How it works */}
			<section id="about" className="bg-(--surface-muted) py-16 md:py-24">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="mb-12 text-center">
						<Eyebrow>วิธีใช้งาน</Eyebrow>
						<h2 className="mt-2 text-h2">เริ่มเรียนใน 3 ขั้นตอน</h2>
					</div>
					<div className="grid gap-6 md:grid-cols-3">
						{STEPS.map((s) => {
							const Ic = s.icon;
							return (
								<article
									key={s.n}
									className="rounded-card border border-(--border) bg-(--surface) p-6"
								>
									<div className="mb-5 flex items-center justify-between">
										<div className="inline-flex h-14 w-14 items-center justify-center rounded-card border border-(--border) bg-(--surface-muted) text-(--primary)">
											<Ic size={28} weight="bold" />
										</div>
										<span
											className="num text-(--foreground-subtle)"
											style={{
												fontSize: 32,
												fontWeight: 700,
												letterSpacing: "-0.02em",
											}}
										>
											{s.n}
										</span>
									</div>
									<h3 className="text-h3">{s.title}</h3>
									<p className="mt-2 text-body text-(--foreground-muted)">
										{s.body}
									</p>
								</article>
							);
						})}
					</div>
				</div>
			</section>

			{/* Why Finalive */}
			<section className="py-16 md:py-24">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="mb-12 text-center">
						<Eyebrow>ทำไมต้อง Finalive</Eyebrow>
						<h2 className="mt-2 text-h2">เรียนกับผู้เชี่ยวชาญตัวจริง</h2>
					</div>
					<div className="grid gap-6 md:grid-cols-3">
						{FEATURES.map((f) => (
							<article
								key={f.title}
								className="rounded-card border border-(--border) bg-(--surface) p-6"
							>
								<div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-card border border-(--border) bg-(--surface-muted) text-(--primary)">
									<f.icon size={28} weight="bold" />
								</div>
								<h3 className="text-h3">{f.title}</h3>
								<p className="mt-2 text-body text-(--foreground-muted)">
									{f.body}
								</p>
							</article>
						))}
					</div>
				</div>
			</section>

			{/* Testimonials */}
			<section className="bg-(--surface-muted) py-16 md:py-24">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="mb-12 text-center">
						<Eyebrow>รีวิวจากนักเรียน</Eyebrow>
						<h2 className="mt-2 text-h2">เสียงจากผู้เรียนจริง</h2>
					</div>
					<div className="grid gap-6 md:grid-cols-3">
						{TESTIMONIALS.map((t) => (
							<article
								key={t.initials}
								className="relative rounded-card border border-(--border) bg-(--surface) p-6"
							>
								<Quotes
									size={32}
									weight="bold"
									className="mb-4 text-(--primary)/20"
									aria-hidden
								/>
								<p className="text-body text-(--foreground)">“{t.quote}”</p>
								<div className="mt-6 flex items-center gap-3">
									<div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-[#6366F1] to-[#8B5CF6] text-sm font-semibold text-white">
										{t.initials}
									</div>
									<div>
										<div className="text-ui font-semibold text-(--foreground)">
											{t.name}
										</div>
										<div className="text-caption text-(--foreground-muted)">
											{t.role}
										</div>
									</div>
								</div>
							</article>
						))}
					</div>
				</div>
			</section>

			{/* Instructor Spotlight */}
			<section className="py-16 md:py-24">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
						{/* Portrait Card */}
						<div className="relative overflow-hidden rounded-card border border-(--border) bg-linear-to-br from-[#312E81] to-[#1E1B4B] p-8 md:p-10">
							<svg
								aria-hidden
								className="absolute inset-0 h-full w-full opacity-20"
								viewBox="0 0 400 400"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<circle cx="80" cy="80" r="120" fill="#818CF8" />
								<circle cx="350" cy="300" r="100" fill="#F97316" />
								<circle cx="200" cy="350" r="80" fill="#6366F1" />
							</svg>
							<div className="relative">
								<div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-3xl font-bold text-white backdrop-blur-sm">
									อร
								</div>
								<div className="text-uism font-medium text-white/70">
									ผู้ก่อตั้ง &amp; ผู้สอนหลัก
								</div>
								<div className="mt-1 text-h3 text-white">อาจารย์อาร์ม</div>
								<div className="mt-1 text-body text-white/70">
									CFA Charterholder · 15 ปีประสบการณ์
								</div>
							</div>
						</div>

						{/* Info */}
						<div>
							<Eyebrow>ผู้สอนแนะนำ</Eyebrow>
							<h2 className="mt-2 text-h2">เรียนกับผู้เชี่ยวชาญตัวจริง</h2>
							<div className="mt-4 flex flex-wrap gap-2">
								{[
									"CFA Charterholder",
									"15 ปีประสบการณ์",
									"อดีต VP Investment",
								].map((badge) => (
									<span
										key={badge}
										className="inline-flex items-center rounded-full border border-(--border) bg-(--surface-muted) px-3 py-1 text-uism text-(--foreground-muted)"
									>
										{badge}
									</span>
								))}
							</div>
							<p className="mt-5 text-body text-(--foreground-muted)">
								อาจารย์อาร์มมีประสบการณ์กว่า 15 ปีในวงการการเงินและการลงทุน
								เคยดำรงตำแหน่ง VP Investment ในบริษัทจัดการกองทุนชั้นนำ และถือใบอนุญาต
								CFA Charterholder
								ด้วยความตั้งใจถ่ายทอดความรู้ให้คนไทยเข้าใจการลงทุนแบบมืออาชีพ
								ผ่านคอร์สที่ออกแบบมาอย่างเป็นระบบ
							</p>
							<div className="mt-6 flex flex-wrap gap-6">
								<div>
									<div
										className="num text-(--foreground)"
										style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}
									>
										15
									</div>
									<div className="mt-1 text-caption text-(--foreground-muted)">
										คอร์ส
									</div>
								</div>
								<div>
									<div
										className="num text-(--foreground)"
										style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}
									>
										50,000+
									</div>
									<div className="mt-1 text-caption text-(--foreground-muted)">
										นักเรียน
									</div>
								</div>
								<div>
									<div
										className="num flex items-center gap-1 text-(--foreground)"
										style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}
									>
										4.9
										<Star
											size={18}
											weight="fill"
											className="text-(--warning)"
										/>
									</div>
									<div className="mt-1 text-caption text-(--foreground-muted)">
										คะแนนเฉลี่ย
									</div>
								</div>
							</div>
							<div className="mt-8">
								<Link
									href="/instructor"
									className="inline-flex h-12 items-center gap-2 rounded-full bg-(--primary) px-8 text-ui font-medium text-(--primary-fg) transition-colors hover:bg-(--primary-hover)"
								>
									เรียนรู้เพิ่มเติม <ArrowRight size={16} weight="bold" />
								</Link>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* CTA banner */}
			<section className="bg-(--primary) py-14 md:py-20">
				<div className="mx-auto max-w-[1200px] px-6">
					<div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center md:gap-8">
						<div>
							<h2 className="text-h2 max-w-[640px] text-white">
								พร้อมเริ่มเรียนแล้วใช่ไหม?
							</h2>
							<p className="mt-2.5 max-w-[540px] text-bodylg text-white/80">
								ลงทะเบียนฟรีวันนี้ เริ่มจากคอร์สตัวอย่าง — ดูได้ทันทีไม่ต้องชำระเงิน
							</p>
						</div>
						<div className="flex flex-wrap gap-3">
							<Link
								href="/register"
								className="inline-flex h-12 items-center gap-2 rounded-full bg-(--accent) px-8 text-ui font-medium text-(--accent-fg) transition-colors hover:bg-(--accent-hover)"
							>
								ลงทะเบียนฟรี <ArrowRight size={16} weight="bold" />
							</Link>
							<Link
								href="/courses"
								className="inline-flex h-12 items-center rounded-full border border-white/25 bg-white/10 px-8 text-ui font-medium text-white transition-colors hover:bg-white/20"
							>
								ดูคอร์สทั้งหมด
							</Link>
						</div>
					</div>
				</div>
			</section>
		</PublicShell>
	);
}

function StaticCourseCard({
	slug,
	title,
	summary,
	price,
	students,
	tag,
	tagTone,
}: {
	slug: string;
	title: string;
	summary: string;
	price: string;
	students: string;
	tag?: string;
	tagTone?: "success" | "warning" | "primary";
}) {
	const tagStyles = {
		success: "bg-(--success-bg) text-(--success)",
		warning: "bg-(--warning-bg) text-(--warning)",
		primary: "bg-(--primary)/10 text-(--primary)",
	};

	return (
		<Link
			href={`/courses/${slug}`}
			className="group flex h-full flex-col overflow-hidden rounded-card border border-(--border) bg-(--surface) shadow-(--shadow-sm) transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-(--shadow-md) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
		>
			<div
				className="relative aspect-video w-full overflow-hidden bg-(--surface-muted)"
				aria-hidden
			>
				<div className="relative flex h-full w-full items-center justify-center bg-linear-to-br from-[#312E81] to-[#1E1B4B]">
					<div
						aria-hidden
						className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-[#F97316]/20 blur-2xl"
					/>
					<div
						aria-hidden
						className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-[#818CF8]/30 blur-2xl"
					/>
					<span
						className="relative font-semibold text-white"
						style={{ fontSize: 56, letterSpacing: "-0.02em" }}
					>
						{(title.trim().charAt(0) || "F").toUpperCase()}
					</span>
				</div>
				{tag && (
					<span
						className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tagTone ? tagStyles[tagTone] : tagStyles.primary}`}
					>
						{tag}
					</span>
				)}
			</div>
			<div className="flex flex-1 flex-col gap-2 p-5">
				<h3 className="line-clamp-2 text-h4 text-(--foreground) group-hover:text-(--primary)">
					{title}
				</h3>
				<p className="line-clamp-2 text-body text-(--foreground-muted)">
					{summary}
				</p>
				<div className="mt-auto flex items-center justify-between pt-2">
					<span className="num text-h4 font-semibold text-(--foreground)">
						{price === "ฟรี" ? (
							<span className="text-(--success)">ฟรี</span>
						) : (
							<>
								{price}
								<span className="ml-1 text-caption text-(--foreground-muted)">
									บาท
								</span>
							</>
						)}
					</span>
					<span className="inline-flex items-center gap-1 text-uism text-(--foreground-muted)">
						<Users size={14} />
						<span className="num">{students}</span> ผู้เรียน
					</span>
				</div>
			</div>
		</Link>
	);
}

function Eyebrow({ children }: { children: React.ReactNode }) {
	return (
		<div
			className="text-uism font-semibold text-(--primary)"
			style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
		>
			{children}
		</div>
	);
}

function TrustStat({
	value,
	suffix,
	label,
}: {
	value: string;
	suffix?: string;
	label: string;
}) {
	return (
		<div>
			<div
				className="num text-(--foreground)"
				style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}
			>
				{value}
				{suffix && (
					<span className="ml-1 text-ui font-medium text-(--foreground-muted)">
						{suffix}
					</span>
				)}
			</div>
			<div className="mt-1 text-caption text-(--foreground-muted)">{label}</div>
		</div>
	);
}

function HeroVisual() {
	return (
		<div
			className="relative ml-auto hidden w-full max-w-[540px] select-none grid-cols-2 gap-5 md:grid"
			style={{ pointerEvents: "none" }}
		>
			{/* Big featured card */}
			<div className="col-span-2 overflow-hidden rounded-card border border-(--border) bg-(--surface) shadow-(--shadow-lg)">
				<div className="relative aspect-video bg-linear-to-br from-[#312E81] to-[#1E1B4B]">
					<div
						aria-hidden
						className="absolute -right-8 -bottom-8 h-50 w-50 rounded-full bg-[#F97316]/20 blur-2xl"
					/>
					<div
						aria-hidden
						className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-[#818CF8]/20 blur-2xl"
					/>
					<div className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
						<Play size={22} weight="bold" className="text-[#1E1B4B]" />
					</div>
					<span className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
						ตัวอย่างฟรี
					</span>
					<div className="absolute inset-x-4 bottom-4 text-white">
						<div
							className="mb-1 text-[11px] font-medium text-white/70"
							style={{
								textTransform: "uppercase",
								letterSpacing: "0.06em",
							}}
						>
							คอร์สแนะนำ
						</div>
						<div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.25 }}>
							DCF Valuation ขั้นสูง
						</div>
					</div>
				</div>
				<div className="flex items-center justify-between p-4">
					<div className="text-caption text-(--foreground-muted)">
						<span className="num">30</span> บทเรียน ·{" "}
						<span className="num">15</span> ชม.
					</div>
					<span className="flex items-baseline gap-1">
						<span className="num text-h4 font-bold text-(--foreground)">
							3,990
						</span>
						<span className="text-caption text-(--foreground-muted)">บาท</span>
					</span>
				</div>
			</div>

			{/* Course library card */}
			<div className="rounded-card border border-(--border) bg-(--surface) p-4 shadow-(--shadow-md)">
				<div className="mb-3.5 flex items-center gap-2.5">
					<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-(--primary)/10 text-(--primary)">
						<BookOpen size={16} weight="bold" />
					</div>
					<div className="min-w-0">
						<div className="text-uism font-semibold">คอร์สทั้งหมด</div>
						<div className="truncate text-caption text-(--foreground-muted)">
							41 คอร์ส พร้อมเนื้อหา
						</div>
					</div>
				</div>
				<div className="flex gap-1.5">
					{["#4F46E5", "#10B981", "#F97316", "#8B5CF6", "#EC4899"].map(
						(color, i) => (
							<div
								key={i}
								className="h-1.5 flex-1 rounded-full"
								style={{ backgroundColor: color }}
							/>
						),
					)}
				</div>
				<div className="mt-2.5 flex items-center justify-between">
					<span className="text-caption text-(--foreground-muted)">
						6 หมวดหมู่
					</span>
					<span className="num text-caption font-semibold text-(--primary)">
						180+ บทเรียน
					</span>
				</div>
			</div>

			{/* Cert card */}
			<div className="flex flex-col rounded-card border border-(--border) bg-(--surface) p-4 shadow-(--shadow-md)">
				<div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-(--success-bg) text-(--success)">
					<Certificate size={18} weight="bold" />
				</div>
				<div className="text-uism font-semibold">ใบประกาศ</div>
				<div className="text-caption text-(--foreground-muted)">
					ตรวจสอบออนไลน์ได้
				</div>
				<div className="flex-1" />
				<div className="mt-3 flex items-center gap-1.5 text-(--foreground-muted)">
					<ShieldCheck size={13} />
					<span className="text-caption">SHA-256 verify</span>
				</div>
			</div>
		</div>
	);
}
