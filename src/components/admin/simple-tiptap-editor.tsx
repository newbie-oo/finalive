"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
	TextB,
	TextItalic,
	ListBullets,
	ListNumbers,
} from "@phosphor-icons/react";

interface SimpleTiptapEditorProps {
	value: string;
	onChange: (html: string) => void;
	placeholder?: string;
}

export function SimpleTiptapEditor({
	value,
	onChange,
	placeholder = "พิมพ์เนื้อหาที่นี่…",
}: SimpleTiptapEditorProps) {
	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				heading: false,
				codeBlock: false,
				blockquote: false,
				horizontalRule: false,
			}),
			Placeholder.configure({ placeholder }),
		],
		content: value,
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
	});

	if (!editor) return null;

	const btn = (
		active: boolean,
		onClick: () => void,
		icon: React.ReactNode,
		title: string,
	) => (
		<button
			type="button"
			onClick={onClick}
			title={title}
			className={`inline-flex h-8 w-8 items-center justify-center rounded border text-sm transition-colors ${
				active
					? "border-primary bg-primary text-primary-foreground"
					: "border-border bg-background text-foreground hover:bg-muted"
			}`}
		>
			{icon}
		</button>
	);

	return (
		<div className="rounded border border-border bg-background">
			<div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
				{btn(
					editor.isActive("bold"),
					() => editor.chain().focus().toggleBold().run(),
					<TextB size={16} />,
					"ตัวหนา",
				)}
				{btn(
					editor.isActive("italic"),
					() => editor.chain().focus().toggleItalic().run(),
					<TextItalic size={16} />,
					"ตัวเอียง",
				)}
				<span className="mx-1 h-4 w-px bg-border" />
				{btn(
					editor.isActive("bulletList"),
					() => editor.chain().focus().toggleBulletList().run(),
					<ListBullets size={16} />,
					"รายการ",
				)}
				{btn(
					editor.isActive("orderedList"),
					() => editor.chain().focus().toggleOrderedList().run(),
					<ListNumbers size={16} />,
					"ลำดับ",
				)}
			</div>
			<EditorContent
				editor={editor}
				className="prose prose-sm max-w-none px-3 py-2 dark:prose-invert [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-1.5"
			/>
		</div>
	);
}
