import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="text-muted-foreground">ไม่พบหน้าที่คุณต้องการ</p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        กลับหน้าหลัก
      </Link>
    </div>
  );
}
