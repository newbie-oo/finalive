import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label, FieldHelper, FieldError } from "@/components/ui/label";
import { StatusChip } from "@/components/ui/status-chip";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Stepper } from "@/components/ui/stepper";

export const dynamic = "force-static";

export default function PrimitivesPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-12 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-h1">Finalive primitives</h1>
        <p className="text-bodylg text-(--foreground-muted)">
          Visual reference for tokens, buttons, cards, inputs, chips, avatars, stepper.
        </p>
      </header>

      <Section title="Type scale">
        <p className="text-display">Display 48</p>
        <p className="text-h1">Heading 1 — 36</p>
        <p className="text-h2">Heading 2 — 28</p>
        <p className="text-h3">Heading 3 — 22</p>
        <p className="text-h4">Heading 4 — 18</p>
        <p className="text-bodylg">Body large — 17</p>
        <p className="text-body">Body — 15</p>
        <p className="text-ui">UI — 14</p>
        <p className="text-uism">UI small — 13</p>
        <p className="text-caption">Caption — 12</p>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="accent">Accent (payment)</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Card">
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Standard card</CardTitle>
              <CardDescription>radius 14, padding 24, border</CardDescription>
            </CardHeader>
            <CardContent className="text-body text-(--foreground-muted)">
              Use for forms, content, dashboards.
            </CardContent>
            <CardFooter>
              <Button>Save</Button>
              <Button variant="ghost">Cancel</Button>
            </CardFooter>
          </Card>
          <Card interactive>
            <CardTitle>Interactive card</CardTitle>
            <CardDescription>hover lifts -2px with shadow-md.</CardDescription>
          </Card>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="email" required>อีเมล</Label>
            <Input id="email" type="email" placeholder="you@example.com" />
            <FieldHelper>เราจะส่งรหัสยืนยันไปให้</FieldHelper>
          </div>
          <div>
            <Label htmlFor="pw" required>รหัสผ่าน</Label>
            <Input id="pw" type="password" invalid />
            <FieldError>รหัสผ่านสั้นเกินไป</FieldError>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bio">เกี่ยวกับฉัน</Label>
            <Textarea id="bio" placeholder="เล่าให้เราฟังหน่อย" />
          </div>
        </div>
      </Section>

      <Section title="Status chips">
        <div className="flex flex-wrap gap-2">
          <StatusChip tone="primary">Primary</StatusChip>
          <StatusChip tone="success">สำเร็จ</StatusChip>
          <StatusChip tone="warning">รอตรวจ</StatusChip>
          <StatusChip tone="destructive">ปฏิเสธ</StatusChip>
          <StatusChip tone="info">ข้อมูล</StatusChip>
          <StatusChip tone="review">ทบทวน</StatusChip>
          <StatusChip tone="neutral">ปิด</StatusChip>
        </div>
      </Section>

      <Section title="Avatars">
        <div className="flex flex-wrap items-end gap-3">
          <AvatarInitials name="ปวันรัตน์ พันธุ์สายลม" size="xs" />
          <AvatarInitials name="Anna Lee" size="sm" />
          <AvatarInitials name="John Doe" size="md" />
          <AvatarInitials name="ก ข" size="lg" />
          <AvatarInitials name="Jane S" size="xl" />
        </div>
      </Section>

      <Section title="Stepper">
        <Stepper
          current={1}
          steps={[
            { label: "เลือกคอร์ส" },
            { label: "ชำระเงิน" },
            { label: "อัปโหลดสลิป" },
            { label: "สำเร็จ" },
          ]}
        />
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-h3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
