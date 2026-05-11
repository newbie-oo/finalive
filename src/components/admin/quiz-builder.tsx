"use client";

import { Button } from "@/components/ui/button";
import { useQuizBuilder } from "@/hooks/use-quiz-builder";
import type { AdminQuizQuestion } from "@/server/repos/admin-quiz";

interface QuizBuilderProps {
  quizId: string;
  initialPassScorePct: number;
  initialQuestions: AdminQuizQuestion[];
}

export function QuizBuilder({
  quizId,
  initialPassScorePct,
  initialQuestions,
}: QuizBuilderProps) {
  const qb = useQuizBuilder(quizId, initialPassScorePct, initialQuestions);

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
          value={qb.passScorePct}
          onChange={(e) =>
            qb.setPassScorePct(Math.min(100, Math.max(1, Number(e.target.value))))
          }
          className="h-9 w-20 rounded-sm border border-border bg-background px-2 text-sm"
        />
      </div>

      {qb.questions.length === 0 && (
        <p className="text-sm text-muted-foreground">ยังไม่มีคำถาม</p>
      )}

      {qb.questions.map((q, qi) => (
        <div key={q.id} className="rounded-sm border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">คำถามที่ {qi + 1}</span>
            <Button
              size="xs"
              variant="ghost"
              className="text-destructive"
              onClick={() => qb.removeQuestion(qi)}
            >
              ลบ
            </Button>
          </div>

          <textarea
            value={q.promptMd}
            onChange={(e) => qb.updateQuestion(qi, e.target.value)}
            placeholder="คำถาม..."
            rows={2}
            className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
          />

          <div className="space-y-2">
            {q.choices.map((c, ci) => (
              <div key={c.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  checked={c.isCorrect}
                  onChange={() => qb.setCorrectChoice(qi, ci)}
                  className="shrink-0"
                />
                <input
                  type="text"
                  value={c.body}
                  onChange={(e) => qb.updateChoiceBody(qi, ci, e.target.value)}
                  placeholder={`ตัวเลือก ${ci + 1}`}
                  className="flex-1 rounded-sm border border-border bg-background px-2 py-1 text-sm"
                />
                {q.choices.length > 2 && (
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-destructive shrink-0"
                    onClick={() => qb.removeChoice(qi, ci)}
                  >
                    ลบ
                  </Button>
                )}
              </div>
            ))}
          </div>

          {q.choices.length < 6 && (
            <Button size="xs" variant="ghost" onClick={() => qb.addChoice(qi)}>
              + เพิ่มตัวเลือก
            </Button>
          )}
        </div>
      ))}

      <div className="flex gap-3">
        <Button size="sm" variant="outline" onClick={qb.addQuestion}>
          + เพิ่มคำถาม
        </Button>
        <Button size="sm" onClick={qb.handleSave} disabled={qb.pending}>
          {qb.pending ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
      </div>
    </div>
  );
}
