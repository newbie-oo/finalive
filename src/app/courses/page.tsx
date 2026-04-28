import { PublicShell } from "@/components/layouts/public-shell";

export default function CoursesPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-5xl p-8">
        <h1 className="mb-4 text-2xl font-semibold">คอร์สทั้งหมด</h1>
        <p className="text-sm text-muted-foreground">
          รายการคอร์สจะปรากฏในสปรินต์ 2 (catalog + pagination)
        </p>
      </section>
    </PublicShell>
  );
}
