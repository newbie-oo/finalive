"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { submitQuizAction } from "@/server/actions/quiz";
import type { QuizWithQuestions } from "@/server/repos/quiz";
import { Button } from "@/components/ui/button";

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
    const Icon = result.passed ? CheckCircle : XCircle;
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <Icon
          size={72}
          weight="fill"
          className={result.passed ? "text-success" : "text-destructive"}
        />
        <h2 className="text-h2">{result.passed ? "ผ่าน" : "ยังไม่ผ่าน"}</h2>
        <p className="num text-h3 font-semibold">
          {result.scorePct}%{" "}
          <span className="text-bodylg font-normal text-(--foreground-muted)">
            ({result.correctCount}/{result.totalQuestions})
          </span>
        </p>
        <Button onClick={() => setResult(null)} variant="primary" size="lg">
          ทำอีกครั้ง
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {quiz.questions.map((q, idx) => (
        <fieldset key={q.id} className="space-y-3">
          <legend className="text-uism font-semibold uppercase tracking-wide text-(--primary)">
            คำถาม {idx + 1}
          </legend>
          <p className="text-bodylg text-(--foreground)">{q.promptMd}</p>
          <div className="space-y-2">
            {q.choices.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-(--border) px-4 py-3 text-body transition-colors hover:border-(--primary) has-[:checked]:border-(--primary) has-[:checked]:bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]"
              >
                <input
                  type="radio"
                  value={c.id}
                  {...register(q.id)}
                  className="h-4 w-4 accent-(--primary)"
                />
                <span>{c.body}</span>
              </label>
            ))}
          </div>
          {errors[q.id] && (
            <p role="alert" className="text-uism text-destructive">
              {errors[q.id]?.message}
            </p>
          )}
        </fieldset>
      ))}

      <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "กำลังส่ง..." : "ส่งคำตอบ"}
      </Button>
    </form>
  );
}
