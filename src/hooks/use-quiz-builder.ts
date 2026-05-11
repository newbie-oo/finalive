"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useUnsavedChangesWarning } from "@/lib/use-unsaved-changes";
import { saveQuizAction } from "@/server/actions/admin-quiz";
import type { AdminQuizQuestion } from "@/server/repos/admin-quiz";

interface ServerIdRegistry {
  questions: Set<string>;
  choices: Set<string>;
}

function collectServerIds(questions: AdminQuizQuestion[]): ServerIdRegistry {
  const registry: ServerIdRegistry = {
    questions: new Set(),
    choices: new Set(),
  };
  for (const q of questions) {
    registry.questions.add(q.id);
    for (const c of q.choices) registry.choices.add(c.id);
  }
  return registry;
}

export interface UseQuizBuilderReturn {
  passScorePct: number;
  setPassScorePct: (v: number) => void;
  questions: AdminQuizQuestion[];
  pending: boolean;
  isDirty: boolean;
  addQuestion: () => void;
  removeQuestion: (index: number) => void;
  updateQuestion: (index: number, promptMd: string) => void;
  addChoice: (qIndex: number) => void;
  removeChoice: (qIndex: number, cIndex: number) => void;
  updateChoiceBody: (qIndex: number, cIndex: number, body: string) => void;
  setCorrectChoice: (qIndex: number, cIndex: number) => void;
  handleSave: () => void;
}

export function useQuizBuilder(
  quizId: string,
  initialPassScorePct: number,
  initialQuestions: AdminQuizQuestion[],
): UseQuizBuilderReturn {
  const [passScorePct, setPassScorePct] = useState<number>(initialPassScorePct);
  const [questions, setQuestions] =
    useState<AdminQuizQuestion[]>(initialQuestions);
  const [pending, startTransition] = useTransition();

  // Tracks which IDs in current state came from the server vs. were generated
  // locally for newly-added rows. Only server IDs are sent back on save.
  const serverIds = useRef<ServerIdRegistry>(
    collectServerIds(initialQuestions),
  );

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
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, promptMd } : q)),
    );
  }

  function addChoice(qIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              choices: [
                ...q.choices,
                {
                  id: crypto.randomUUID(),
                  body: "",
                  isCorrect: false,
                  sortOrder: q.choices.length,
                },
              ],
            }
          : q,
      ),
    );
  }

  function removeChoice(qIndex: number, cIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, choices: q.choices.filter((_, ci) => ci !== cIndex) }
          : q,
      ),
    );
  }

  function updateChoiceBody(qIndex: number, cIndex: number, body: string) {
    setQuestions((prev) =>
      prev.map((q, qi) =>
        qi === qIndex
          ? {
              ...q,
              choices: q.choices.map((c, ci) =>
                ci === cIndex ? { ...c, body } : c,
              ),
            }
          : q,
      ),
    );
  }

  function setCorrectChoice(qIndex: number, cIndex: number) {
    setQuestions((prev) =>
      prev.map((q, qi) =>
        qi === qIndex
          ? {
              ...q,
              choices: q.choices.map((c, ci) => ({
                ...c,
                isCorrect: ci === cIndex,
              })),
            }
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

  return {
    passScorePct,
    setPassScorePct,
    questions,
    pending,
    isDirty,
    addQuestion,
    removeQuestion,
    updateQuestion,
    addChoice,
    removeChoice,
    updateChoiceBody,
    setCorrectChoice,
    handleSave,
  };
}
