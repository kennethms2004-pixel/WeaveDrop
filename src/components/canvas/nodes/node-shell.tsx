"use client";

import type { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";

type NodeShellProps = {
  children: ReactNode;
  selected: boolean;
};

export function NodeShell({ children, selected }: NodeShellProps) {
  return (
    <div
      className="relative min-w-0 overflow-visible rounded-md border bg-card text-foreground transition-shadow duration-200"
      style={{
        borderColor: selected
          ? "color-mix(in oklch, var(--brand) 78%, var(--rule))"
          : "var(--rule)",
        boxShadow: selected
          ? "0 0 0 3px color-mix(in oklch, var(--brand) 16%, transparent), 0 10px 28px rgba(28,27,26,0.12)"
          : "0 4px 20px -2px rgba(28,27,26,0.08)",
        background:
          "color-mix(in oklch, var(--surface) 94%, var(--paper))",
      }}
    >
      <Handle
        className="!h-3 !w-3 !border-2 !bg-background"
        id="left"
        position={Position.Left}
        style={{
          borderColor: "var(--brand)",
          left: -7,
          top: "50%",
        }}
        type="target"
      />
      <Handle
        className="!h-3 !w-3 !border-2 !bg-background"
        id="right"
        position={Position.Right}
        style={{
          borderColor: "var(--brand)",
          right: -7,
          top: "50%",
        }}
        type="source"
      />
      {children}
    </div>
  );
}
