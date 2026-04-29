"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import {
  TextB,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
  ListBullets,
  ListNumbers,
  Quotes,
  Code,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  Image as ImageIcon,
  Link as LinkIcon,
  Minus,
  Eraser,
  ArrowCounterClockwise,
  ArrowClockwise,
} from "@phosphor-icons/react";

interface TiptapEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function TiptapEditor({
  value,
  onChange,
  placeholder = "พิมพ์เนื้อหาที่นี่…",
}: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    // Tiptap v3 throws an SSR error in Next App Router unless this is
    // false — the editor must wait for hydration before mounting against
    // the DOM. Without it the lesson editor crashes on first render.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Image.configure({
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Underline,
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
    title: string
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

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      window.alert("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert("ไฟล์ใหญ่เกิน 5 MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/lesson-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "upload_failed");
      }

      const { url } = await res.json();
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      console.error("Image upload failed:", err);
      window.alert("อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const addImage = () => {
    const choice = window.confirm(
      "Upload รูปจากเครื่อง?\nกด Cancel ถ้าต้องการใส่ URL แทน"
    );
    if (choice) {
      fileInputRef.current?.click();
    } else {
      const url = window.prompt("ใส่ URL ของรูปภาพ");
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
  };

  const addLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("ใส่ URL ของลิงก์", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const setAlign = (align: "left" | "center" | "right") => {
    editor.chain().focus().setTextAlign(align).run();
  };

  return (
    <div className="rounded border border-border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        {/* Inline formatting */}
        {btn(
          editor.isActive("bold"),
          () => editor.chain().focus().toggleBold().run(),
          <TextB size={16} />,
          "ตัวหนา"
        )}
        {btn(
          editor.isActive("italic"),
          () => editor.chain().focus().toggleItalic().run(),
          <TextItalic size={16} />,
          "ตัวเอียง"
        )}
        {btn(
          editor.isActive("underline"),
          () => editor.chain().focus().toggleUnderline().run(),
          <TextUnderline size={16} />,
          "ขีดเส้นใต้"
        )}
        {btn(
          editor.isActive("strike"),
          () => editor.chain().focus().toggleStrike().run(),
          <TextStrikethrough size={16} />,
          "ขีดฆ่า"
        )}
        <span className="mx-1 h-4 w-px bg-border" />

        {/* Headings */}
        {btn(
          editor.isActive("heading", { level: 2 }),
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          <span className="text-xs font-bold">H2</span>,
          "หัวข้อใหญ่"
        )}
        {btn(
          editor.isActive("heading", { level: 3 }),
          () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          <span className="text-xs font-bold">H3</span>,
          "หัวข้อย่อย"
        )}
        <span className="mx-1 h-4 w-px bg-border" />

        {/* Lists & blocks */}
        {btn(
          editor.isActive("bulletList"),
          () => editor.chain().focus().toggleBulletList().run(),
          <ListBullets size={16} />,
          "รายการ"
        )}
        {btn(
          editor.isActive("orderedList"),
          () => editor.chain().focus().toggleOrderedList().run(),
          <ListNumbers size={16} />,
          "ลำดับ"
        )}
        {btn(
          editor.isActive("blockquote"),
          () => editor.chain().focus().toggleBlockquote().run(),
          <Quotes size={16} />,
          "คำคม"
        )}
        {btn(
          editor.isActive("code"),
          () => editor.chain().focus().toggleCode().run(),
          <Code size={16} />,
          "โค้ด"
        )}
        <span className="mx-1 h-4 w-px bg-border" />

        {/* Alignment */}
        {btn(
          editor.isActive({ textAlign: "left" }),
          () => setAlign("left"),
          <TextAlignLeft size={16} />,
          "จัดชิดซ้าย"
        )}
        {btn(
          editor.isActive({ textAlign: "center" }),
          () => setAlign("center"),
          <TextAlignCenter size={16} />,
          "จัดกึ่งกลาง"
        )}
        {btn(
          editor.isActive({ textAlign: "right" }),
          () => setAlign("right"),
          <TextAlignRight size={16} />,
          "จัดชิดขวา"
        )}
        <span className="mx-1 h-4 w-px bg-border" />

        {/* Media & link */}
        {btn(
          false,
          addImage,
          <ImageIcon size={16} className={isUploading ? "opacity-50" : ""} />,
          isUploading ? "กำลังอัปโหลด…" : "ใส่รูปภาพ"
        )}
        {btn(
          editor.isActive("link"),
          addLink,
          <LinkIcon size={16} />,
          "ใส่ลิงก์"
        )}
        {btn(
          false,
          () => editor.chain().focus().setHorizontalRule().run(),
          <Minus size={16} />,
          "เส้นคั่น"
        )}
        <span className="mx-1 h-4 w-px bg-border" />

        {/* Utilities */}
        {btn(
          false,
          () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
          <Eraser size={16} />,
          "ล้างรูปแบบ"
        )}
        <span className="mx-1 h-4 w-px bg-border" />

        {/* History */}
        {btn(
          false,
          () => editor.chain().focus().undo().run(),
          <ArrowCounterClockwise size={16} />,
          "ย้อนกลับ"
        )}
        {btn(
          false,
          () => editor.chain().focus().redo().run(),
          <ArrowClockwise size={16} />,
          "ทำซ้ำ"
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
        }}
      />
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 dark:prose-invert [&_.ProseMirror]:min-h-[240px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-1.5"
      />
    </div>
  );
}
