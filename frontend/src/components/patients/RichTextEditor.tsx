import { useState, useRef, useCallback } from "react";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Heading1, Heading2, Type, Undo, Redo
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const TOOLBAR_GROUPS = [
  [
    { command: "formatBlock", arg: "<h1>", icon: Heading1, title: "Título 1" },
    { command: "formatBlock", arg: "<h2>", icon: Heading2, title: "Título 2" },
    { command: "formatBlock", arg: "<p>", icon: Type, title: "Párrafo" },
  ],
  [
    { command: "bold", icon: Bold, title: "Negrita" },
    { command: "italic", icon: Italic, title: "Cursiva" },
    { command: "underline", icon: Underline, title: "Subrayado" },
  ],
  [
    { command: "justifyLeft", icon: AlignLeft, title: "Izquierda" },
    { command: "justifyCenter", icon: AlignCenter, title: "Centrar" },
    { command: "justifyRight", icon: AlignRight, title: "Derecha" },
  ],
  [
    { command: "insertUnorderedList", icon: List, title: "Viñetas" },
    { command: "insertOrderedList", icon: ListOrdered, title: "Numeración" },
  ],
  [
    { command: "undo", icon: Undo, title: "Deshacer" },
    { command: "redo", icon: Redo, title: "Rehacer" },
  ],
];

export const RichTextEditor = ({ value, onChange, placeholder = "Escriba aquí...", minHeight = "200px" }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const execCommand = useCallback((command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const isEmpty = !value || value === "<br>" || value === "<div><br></div>";

  return (
    <div className={cn(
      "rounded-xl border transition-colors overflow-hidden",
      isFocused ? "border-primary ring-2 ring-primary/20" : "border-border"
    )}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-muted/30 border-b border-border">
        {TOOLBAR_GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <div className="w-px h-5 bg-border mx-1" />}
            {group.map((btn, bi) => (
              <button
                key={bi}
                type="button"
                title={btn.title}
                onMouseDown={(e) => {
                  e.preventDefault();
                  execCommand(btn.command, (btn as any).arg);
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <btn.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Editor Area */}
      <div className="relative">
        {isEmpty && !isFocused && (
          <p className="absolute inset-0 px-4 py-3 text-sm text-muted-foreground pointer-events-none">{placeholder}</p>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="px-4 py-3 text-sm text-card-foreground outline-none prose prose-sm max-w-none [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
          style={{ minHeight }}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      </div>
    </div>
  );
};
