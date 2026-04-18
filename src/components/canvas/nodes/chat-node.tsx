"use client";

import { MessageSquare, Sparkles } from "lucide-react";

import { NodeShell } from "./node-shell";
import type { ChatContextTone, ChatFlowNodeProps } from "./types";

const toneStyles: Record<ChatContextTone, string> = {
  muted: "text-fg-subtle",
  neutral: "text-fg-muted",
  ok: "text-moss",
  warn: "text-ochre",
  fail: "text-rust",
};

export function ChatNode({
  data,
  selected,
}: ChatFlowNodeProps) {
  const preview = data.latestMessagePreview;
  const previewLabel =
    preview?.role === "assistant"
      ? "Drop"
      : preview?.role === "system"
        ? "System"
        : "You";

  return (
    <NodeShell selected={selected}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{
              background:
                "color-mix(in oklch, var(--brand) 12%, var(--paper))",
              color: "var(--brand)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-serif text-[18px] leading-none text-foreground">
              {data.title}
            </p>
            <p className="mono-label mt-1">Chat</p>
          </div>
        </div>
        <MessageSquare className="h-4 w-4 text-fg-subtle" />
      </div>

      <button
        className="nodrag nopan block w-full text-left"
        onClick={data.onOpen}
        type="button"
      >
        <div className="px-4 py-4">
          {preview ? (
            <>
              <p className="mono-label mb-1">{previewLabel}</p>
              <p className="line-clamp-4 text-[14px] leading-6 text-foreground">
                {preview.content}
              </p>
            </>
          ) : (
            <p className="text-[14px] leading-6 text-fg-subtle">
              Open chat to start the thread.
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-between border-t px-4 py-3"
          style={{
            borderColor: "var(--rule)",
            background:
              "color-mix(in oklch, var(--surface) 78%, var(--paper))",
          }}
        >
          <span
            className={`mono-label normal-case tracking-[0.08em] ${toneStyles[data.contextSummary.tone]}`}
          >
            {data.contextSummary.label}
          </span>
          <span className="text-[12px] font-medium text-brand">Open</span>
        </div>
      </button>
    </NodeShell>
  );
}
