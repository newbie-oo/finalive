"use client";

import { useRouter } from "next/navigation";
import { X } from "@phosphor-icons/react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QuizExitButtonProps {
	/** Where to send the student after they confirm they want to leave. */
	lessonHref: string;
}

/**
 * Confirm-before-exit guard for the quiz screen. The bare X used to close
 * the quiz was a hard link — clicking it dropped any in-progress answers
 * with no undo. Wrap it in a shadcn AlertDialog so the action is reversible
 * and the user understands what they're losing.
 */
export function QuizExitButton({ lessonHref }: QuizExitButtonProps) {
	const router = useRouter();

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<button
					type="button"
					className="inline-flex items-center gap-1.5 rounded-nav px-2 py-1.5 text-uism text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
				>
					<X size={16} />
					ออกจากแบบทดสอบ
				</button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ออกจากแบบทดสอบ?</AlertDialogTitle>
					<AlertDialogDescription>
						คะแนนที่ยังไม่ได้ส่งจะหายไป — สามารถเริ่มทำใหม่ได้ตลอดเวลา
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>ทำต่อ</AlertDialogCancel>
					<AlertDialogAction
						onClick={() => router.push(lessonHref)}
						className="bg-destructive text-white hover:bg-destructive/90"
					>
						ออกเลย
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
