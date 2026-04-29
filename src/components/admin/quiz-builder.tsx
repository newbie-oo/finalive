"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveQuizAction } from "@/server/actions/admin-quiz";
import { useUnsavedChangesWarning } from "@/lib/use-unsaved-changes";
import type { AdminQuizQuestion } from "@/server/repos/admin-quiz";

interface QuizBuilderProps {
  quizId: string;
  initialPassScorePct: number;
  initialQuestions: AdminQuizQuestion[];
}

interface ServerIdRegistry {
  questions: Set<string>;
  choices: Set<string>;
}

function collectServerIds(questions: AdminQuizQuestion[]): ServerIdRegistry {
  const registry: ServerIdRegistry = { questions: new Set(), choices: new Set() };
  for (const q of questions) {
    registry.questions.add(q.id);
    for (const c of q.choices) registry.choices.add(c.id);
  }
  return registry;
}

export function QuizBuilder({ quizId, initialPassScorePct, initialQuestions }: QuizBuilderProps) {
  const [passScorePct, setPassScorePct] = useState<number>(initialPassScorePct);
  const [questions, setQuestions] = useState<AdminQuizQuestion[]>(initialQuestions);
  const [pending, startTransition] = useTransition();
  // Tracks which IDs in current state came from the server vs. were generated
  // locally for newly-added rows. Only server IDs are sent back on save.
  const serverIds = useRef<ServerIdRegistry>(collectServerIds(initialQuestions));
  // Snapshot the last-saved shape so we can compute isDirty without forcing
  // every mutator to flip a flag manually.
  const lastSavedRef = useRef({
    passScorePct: initialPassScorePct,
    questionsJson: JSON.stringify(initialQuestions),
  });
  const [isDirty, setIsDirty] = useState(false);
  useEffect(() => {
    const dirty =
      passScorePct !== lastSavedRef.current.passScorePct ||
      JSON.stringify(questions) !== lastSavedRef.current.questionsJson;
    setIsDirty(dirty);
  }, [passScorePct, questions]);
  useUnsavedChangesWarning(isDirty);

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

    // Only forward IDs that came from the server. Local crypto.randomUUID()
    // ids are stripped so the server treats them as new inserts; otherwise
    // a second save would send IDs the DB has never seen and the upsert path
    // would soft-delete + re-insert at the same sort_order, tripping the
    // unique constraint.
    const payload = {
      quizId,
      passScorePct,
      questions: questions.map((q) => ({
        id: serverIds.current.questions.has(q.id) ? q.id : undefined,
        promptMd: q.promptMd,
        choices: q.choices.map((c) => ({
          id: serverIds.current.choices.has(c.id) ? c.id : undefined,
          body: c.body,
          isCorrect: c.isCorrect,
        })),
      })),
    };

    startTransition(async () => {
      const result = await saveQuizAction(payload);
      if (result.ok) {
        // Replace local state with server state so persisted IDs flow back
        // and the next save targets real rows.
        setQuestions(result.quiz.questions);
        setPassScorePct(result.quiz.passScorePct);
        serverIds.current = collectServerIds(result.quiz.questions);
        lastSavedRef.current = {
          passScorePct: result.quiz.passScorePct,
          questionsJson: JSON.stringify(result.quiz.questions),
        };
        toast.success("บันทึกแบบทดสอบสำเร็จ");
      } else {
        toast.error("บันทึกไม่สำเร็จ");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label htmlFor="passScorePct" className="text-sm font-medium">
          คะแนนขั้นต่ำผ่าน (%)
        </label>
        <input
          id="passScorePct"
          type="number"
          min={1}
          max={100}
          value={passScorePct}
          onChange={(e) => setPassScorePct(Math.min(100, Math.max(1, Number(e.target.value))))}
          className="h-9 w-20 rounded border border-border bg-background px-2 text-sm"
        />
      </div>

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
