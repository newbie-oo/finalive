"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveQuizAction } from "@/server/actions/admin-quiz";
import type { AdminQuizQuestion } from "@/server/repos/admin-quiz";

interface QuizBuilderProps {
  quizId: string;
  initialQuestions: AdminQuizQuestion[];
}

export function QuizBuilder({ quizId, initialQuestions }: QuizBuilderProps) {
  const [questions, setQuestions] = useState<AdminQuizQuestion[]>(initialQuestions);
  const [pending, startTransition] = useTransition();

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        promptMd: "",
        sortOrder: prev.length,
        choices: [
          { id: crypto.randomUUID(), body: "", isCorrect: true, sortOrder: 0 },
          { id: crypto.randomUUID(), body: "", isCorrect: false, sortOrder: 1 },
        ],
      },
    ]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuestion(index: number, promptMd: string) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, promptMd } : q)));
  }

  function addChoice(qIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              choices: [
                ...q.choices,
                { id: crypto.randomUUID(), body: "", isCorrect: false, sortOrder: q.choices.length },
              ],
            }
          : q,
      ),
    );
  }

  function removeChoice(qIndex: number, cIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, choices: q.choices.filter((_, ci) => ci !== cIndex) } : q,
      ),
    );
  }

  function updateChoiceBody(qIndex: number, cIndex: number, body: string) {
    setQuestions((prev) =>
      prev.map((q, qi) =>
        qi === qIndex
          ? { ...q, choices: q.choices.map((c, ci) => (ci === cIndex ? { ...c, body } : c)) }
          : q,
      ),
    );
  }

  function setCorrectChoice(qIndex: number, cIndex: number) {
    setQuestions((prev) =>
      prev.map((q, qi) =>
        qi === qIndex
          ? { ...q, choices: q.choices.map((c, ci) => ({ ...c, isCorrect: ci === cIndex })) }
          : q,
      ),
    );
  }

  function handleSave() {
    // Validate: each question must have at least 2 choices and exactly 1 correct answer.
    for (const q of questions) {
      if (q.choices.length < 2) {
        toast.error("แต่ละคำถามต้องมีอย่างน้อย 2 ตัวเลือก");
        return;
      }
      const correctCount = q.choices.filter((c) => c.isCorrect).length;
      if (correctCount !== 1) {
        toast.error("แต่ละคำถามต้องมีคำตอบที่ถูกต้อง 1 ข้อ");
        return;
      }
      if (!q.promptMd.trim()) {
        toast.error("กรุณากรอกคำถามทั้งหมด");
        return;
      }
      for (const c of q.choices) {
        if (!c.body.trim()) {
          toast.error("กรุณากรอกตัวเลือกทั้งหมด");
          return;
        }
      }
    }

    const payload = {
      quizId,
      questions: questions.map((q) => ({
        id: q.id.includes("-") && q.id.length === 36 ? q.id : undefined,
        promptMd: q.promptMd,
        choices: q.choices.map((c) => ({
          id: c.id.includes("-") && c.id.length === 36 ? c.id : undefined,
          body: c.body,
          isCorrect: c.isCorrect,
        })),
      })),
    };

    startTransition(async () => {
      const result = await saveQuizAction(payload);
      if (result.ok) {
        toast.success("บันทึกแบบทดสอบสำเร็จ");
      } else {
        toast.error("บันทึกไม่สำเร็จ");
      }
    });
  }

  return (
    <div className="space-y-6">
      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground">ยังไม่มีคำถาม</p>
      )}

      {questions.map((q, qi) => (
        <div key={q.id} className="rounded border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">คำถามที่ {qi + 1}</span>
            <Button
              size="xs"
              variant="ghost"
              className="text-destructive"
              onClick={() => removeQuestion(qi)}
            >
              ลบ
            </Button>
          </div>

          <textarea
            value={q.promptMd}
            onChange={(e) => updateQuestion(qi, e.target.value)}
            placeholder="คำถาม..."
            rows={2}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />

          <div className="space-y-2">
            {q.choices.map((c, ci) => (
              <div key={c.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  checked={c.isCorrect}
                  onChange={() => setCorrectChoice(qi, ci)}
                  className="shrink-0"
                />
                <input
                  type="text"
                  value={c.body}
                  onChange={(e) => updateChoiceBody(qi, ci, e.target.value)}
                  placeholder={`ตัวเลือก ${ci + 1}`}
                  className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                />
                {q.choices.length > 2 && (
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-destructive shrink-0"
                    onClick={() => removeChoice(qi, ci)}
                  >
                    ลบ
                  </Button>
                )}
              </div>
            ))}
          </div>

          {q.choices.length < 6 && (
            <Button size="xs" variant="ghost" onClick={() => addChoice(qi)}>
              + เพิ่มตัวเลือก
            </Button>
          )}
        </div>
      ))}

      <div className="flex gap-3">
        <Button size="sm" variant="outline" onClick={addQuestion}>
          + เพิ่มคำถาม
        </Button>
        <Button size="sm" onClick={handleSave} disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
      </div>
    </div>
  );
}
