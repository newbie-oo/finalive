"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { submitQuizAction } from "@/server/actions/quiz";
import type { QuizWithQuestions } from "@/server/repos/quiz";

interface QuizFormProps {
  quiz: QuizWithQuestions;
}

function buildSchema(questions: QuizWithQuestions["questions"]) {
  const shape: Record<string, z.ZodString> = {};
  for (const q of questions) {
    shape[q.id] = z.string().min(1, "กรุณาเลือกคำตอบ");
  }
  return z.object(shape);
}

export function QuizForm({ quiz }: QuizFormProps) {
  const schema = buildSchema(quiz.questions);
  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema as never),
  });

  const [result, setResult] = useState<{
    scorePct: number;
    passed: boolean;
    correctCount: number;
    totalQuestions: number;
  } | null>(null);

  const onSubmit = async (data: FormData) => {
    const formData = new FormData();
    formData.append("quizId", quiz.id);
    formData.append("answers", JSON.stringify(data));

    const res = await submitQuizAction(formData);
    if (res.ok && res.result) {
      setResult(res.result);
    }
  };

  if (result) {
    return (
      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">
          {result.passed ? "🎉 ผ่าน!" : "❌ ไม่ผ่าน"}
        </h2>
        <p className="mt-2 text-lg">
          คะแนน: {result.scorePct}% ({result.correctCount}/{result.totalQuestions})
        </p>
        <button
          onClick={() => setResult(null)}
          className="mt-4 rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          ทำอีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-8">
      {quiz.questions.map((q, idx) => (
        <fieldset key={q.id} className="rounded border border-border p-4">
          <legend className="px-2 text-sm font-medium">
            คำถาม {idx + 1}
          </legend>
          <p className="mb-3 text-base">{q.promptMd}</p>
          <div className="space-y-2">
            {q.choices.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-muted"
              >
                <input
                  type="radio"
                  value={c.id}
                  {...register(q.id)}
                  className="h-4 w-4"
                />
                <span className="text-sm">{c.body}</span>
              </label>
            ))}
          </div>
          {errors[q.id] && (
            <p className="mt-2 text-sm text-destructive">
              {errors[q.id]?.message}
            </p>
          )}
        </fieldset>
      ))}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {isSubmitting ? "กำลังส่ง..." : "ส่งคำตอบ"}
      </button>
    </form>
  );
}
