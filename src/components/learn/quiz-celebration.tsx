"use client";

import { useEffect, useState } from "react";
import { Trophy, ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";

interface QuizCelebrationProps {
  passed: boolean;
}

export function QuizCelebration({ passed }: QuizCelebrationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!passed) {
    return (
      <div className="rounded-card border border-border bg-card p-6 text-center">
        <ArrowCounterClockwise
          size={48}
          weight="duotone"
          className="mx-auto mb-3 text-destructive"
        />
        <h3 className="text-h3">สู้ๆ อีกนิด!</h3>
        <p className="mt-1 text-body text-muted-foreground">
          ทบทวนเนื้อหาและลองใหม่อีกครั้ง
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-card border border-success/30 bg-success-bg p-6 text-center transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <Trophy
        size={48}
        weight="fill"
        className="mx-auto mb-3 text-success"
      />
      <h3 className="text-h3 text-success">ยินดีด้วย!</h3>
      <p className="mt-1 text-body text-muted-foreground">
        คุณผ่านแบบทดสอบแล้ว 🎉
      </p>
    </div>
  );
}
