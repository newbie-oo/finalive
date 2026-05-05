import { AccountTabs } from "@/components/account/account-tabs";

/**
 * Account 2-col layout per handoff §15 — left tab list (w240) + right
 * content. The tab list is sticky on lg+ so it stays in view while the
 * user scrolls long content (enrollment grid, security sessions list).
 */
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <AccountTabs />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
