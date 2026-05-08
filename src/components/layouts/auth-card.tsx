import Link from "next/link";
import { Card } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <section className="mx-auto flex w-full max-w-[440px] flex-col gap-6 px-6 py-10 md:py-16">
      <Link
        href="/"
        className="mx-auto flex items-center gap-2 text-foreground"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
        <span className="text-[18px] font-semibold tracking-tight">
          Finalive
        </span>
      </Link>
      <Card className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-h2">{title}</h1>
          {subtitle && (
            <p className="text-body text-muted-foreground">{subtitle}</p>
          )}
        </header>
        {children}
      </Card>
      {footer && (
        <div className="text-center text-body text-muted-foreground">
          {footer}
        </div>
      )}
    </section>
  );
}
