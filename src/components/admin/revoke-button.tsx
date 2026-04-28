"use client";

import { useState } from "react";
import { revokeCertificateAction } from "@/server/actions/certificate-admin";

interface RevokeButtonProps {
  certId: string;
}

export function RevokeButton({ certId }: RevokeButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRevoke = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    const res = await revokeCertificateAction(certId, reason);
    setLoading(false);
    if (res.ok) {
      window.location.reload();
    } else {
      alert("เพิกถอนไม่สำเร็จ");
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-destructive hover:underline"
      >
        เพิกถอน
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="เหตุผล"
        className="rounded border px-2 py-1 text-xs"
      />
      <button
        onClick={handleRevoke}
        disabled={loading}
        className="rounded bg-destructive px-2 py-1 text-xs text-destructive-foreground disabled:opacity-50"
      >
        {loading ? "..." : "ยืนยัน"}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-muted-foreground hover:underline"
      >
        ยกเลิก
      </button>
    </div>
  );
}
