"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

import { NodeShell } from "./node-shell";
import type { NoteFlowNodeProps } from "./types";

function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }
  element.style.height = "0px";
  element.style.height = `${Math.max(element.scrollHeight, 108)}px`;
}

export function NoteNode({
  data,
  selected,
}: NoteFlowNodeProps) {
  const [isEditingBody, setIsEditingBody] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    resizeTextarea(bodyRef.current);
  }, [data.text, isEditingBody]);

  useEffect(() => {
    if (isEditingBody) {
      bodyRef.current?.focus();
    }
  }, [isEditingBody]);

  return (
    <NodeShell selected={selected}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-fg-subtle">
          <FileText className="h-3.5 w-3.5" />
          <span className="mono-label">Note</span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-fg-subtle">
          {data.isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {data.isSaving ? "Saving..." : "Inline"}
        </span>
      </div>

      <div className="space-y-3 px-4 pt-4 pb-4">
        <input
          className="nodrag nopan w-full border-0 bg-transparent p-0 font-serif text-[22px] leading-tight text-foreground outline-none placeholder:text-fg-subtle"
          onChange={(event) => data.onChange({ title: event.target.value })}
          placeholder="Untitled note"
          type="text"
          value={data.title}
        />

        {isEditingBody || !data.text ? (
          <textarea
            className="nodrag nopan w-full resize-none border-0 bg-transparent p-0 text-[14px] leading-6 text-foreground outline-none placeholder:text-fg-subtle"
            onBlur={() => setIsEditingBody(false)}
            onChange={(event) => data.onChange({ text: event.target.value })}
            onFocus={() => setIsEditingBody(true)}
            placeholder="What's on your mind...?"
            ref={bodyRef}
            value={data.text}
          />
        ) : (
          <button
            className="nodrag nopan relative block w-full overflow-hidden text-left text-[14px] leading-6 text-foreground outline-none"
            onClick={() => setIsEditingBody(true)}
            type="button"
          >
            <div className="max-h-[132px] overflow-hidden whitespace-pre-wrap">
              {data.text}
            </div>
            <div
              className="pointer-events-none absolute right-0 bottom-0 left-0 h-10"
              style={{
                background:
                  "linear-gradient(to bottom, color-mix(in oklch, var(--surface) 0%, transparent), color-mix(in oklch, var(--surface) 96%, var(--paper)))",
              }}
            />
          </button>
        )}
      </div>
    </NodeShell>
  );
}
