import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Tailwind,
} from "@react-email/components";
import type { ReactNode } from "react";

export interface EmailShellProps {
  preview: string;
  heading?: string;
  children: ReactNode;
}

export function EmailShell({ preview, heading, children }: EmailShellProps) {
  return (
    <Html lang="th">
      <Head>
        <title>{preview}</title>
      </Head>
      <Tailwind>
        <Body className="bg-slate-50 font-sans">
          <Container className="mx-auto my-8 max-w-[600px] rounded-lg bg-white p-10 shadow-sm">
            <Section className="text-center">
              <Text className="text-lg font-bold text-indigo-600">
                Finalive
              </Text>
            </Section>
            <Hr className="my-6 border-slate-200" />
            {heading ? (
              <Heading className="mb-4 text-2xl font-bold text-slate-900">
                {heading}
              </Heading>
            ) : null}
            {children}
            <Hr className="my-8 border-slate-200" />
            <Section className="text-center">
              <Text className="text-xs text-slate-500">
                © Finalive {new Date().getFullYear()} —{" "}
                <a href="https://finalive.dev" className="text-indigo-600">
                  finalive.dev
                </a>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Section className="my-6 text-center">
      <a
        href={href}
        className="inline-block rounded-md bg-indigo-600 px-6 py-3 font-semibold text-white no-underline"
      >
        {children}
      </a>
    </Section>
  );
}

export function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Text className="my-1 text-sm text-slate-700">
      <span className="text-slate-500">{label}:</span>{" "}
      <span className="font-medium">{value}</span>
    </Text>
  );
}
