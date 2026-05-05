"use client";

import { useState } from "react";
import { Bank, QrCode } from "@phosphor-icons/react";

interface PaymentMethodTabsProps {
  bankText: string | null;
  qrImageUrl: string | null;
}

export function PaymentMethodTabs({
  bankText,
  qrImageUrl,
}: PaymentMethodTabsProps) {
  const hasBank = !!bankText;
  const hasQr = !!qrImageUrl;

  const [activeTab, setActiveTab] = useState<"bank" | "promptpay">(
    hasBank ? "bank" : "promptpay",
  );

  if (!hasBank && !hasQr) {
    return (
      <div className="rounded-card border border-dashed border-(--border) bg-(--surface-muted) p-6 text-center text-body text-(--foreground-muted)">
        กรุณาติดต่อ admin สำหรับข้อมูลการชำระเงิน
      </div>
    );
  }

  if (!hasBank || !hasQr) {
    return (
      <div className="rounded-card bg-(--surface-muted) p-5">
        {hasBank ? (
          <BankContent text={bankText!} />
        ) : (
          <QrContent url={qrImageUrl!} />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <TabButton
          active={activeTab === "bank"}
          onClick={() => setActiveTab("bank")}
          icon={<Bank size={18} />}
          label="โอนผ่านธนาคาร"
          sub="แนบสลิป"
        />
        <TabButton
          active={activeTab === "promptpay"}
          onClick={() => setActiveTab("promptpay")}
          icon={<QrCode size={18} />}
          label="PromptPay"
          sub="สแกน QR"
        />
      </div>
      <div className="rounded-card bg-(--surface-muted) p-5">
        {activeTab === "bank" ? (
          <BankContent text={bankText!} />
        ) : (
          <QrContent url={qrImageUrl!} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-3 rounded-[12px] border p-3.5 text-left font-[inherit] transition-colors ${
        active
          ? "border-primary/60 bg-primary/5"
          : "border-(--border) bg-(--surface)"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          active
            ? "bg-primary text-primary-foreground"
            : "bg-(--surface-muted) text-(--foreground-muted)"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div
          className={`text-sm font-semibold ${
            active ? "text-primary" : "text-(--foreground)"
          }`}
        >
          {label}
        </div>
        <div className="text-uism text-(--foreground-subtle)">{sub}</div>
      </div>
    </button>
  );
}

function BankContent({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Bank size={20} />
        </div>
        <div>
          <div className="text-ui font-semibold text-(--foreground)">
            ข้อมูลบัญชี
          </div>
          <div className="text-uism text-(--foreground-muted)">
            โอนผ่านธนาคาร
          </div>
        </div>
      </div>
      <div className="rounded-input border border-(--border) bg-(--surface) px-4 py-3">
        <p className="whitespace-pre-wrap text-body text-(--foreground)">
          {text}
        </p>
      </div>
    </div>
  );
}

function QrContent({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        width={224}
        height={224}
        alt="PromptPay QR สำหรับโอนค่าคอร์ส"
        className="h-56 w-56 rounded-card border border-(--border) bg-white object-contain p-2"
      />
      <p className="text-uism text-(--foreground-muted)">
        สแกน QR เพื่อชำระเงิน
      </p>
    </div>
  );
}
