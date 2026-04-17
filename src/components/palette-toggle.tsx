"use client";

import { setPalette, usePalette } from "@/lib/use-palette";
import type { Palette } from "@/lib/brand";

const OPTIONS: { id: Palette; label: string }[] = [
  { id: "loom", label: "Loom" },
  { id: "thread", label: "Thread" },
];

type PaletteToggleProps = {
  compact?: boolean;
  className?: string;
};

export function PaletteToggle({ compact = false, className }: PaletteToggleProps) {
  const current = usePalette();

  return (
    <div
      role="group"
      aria-label="Palette"
      className={[
        "inline-flex items-center rounded-full border border-border bg-surface p-[3px]",
        className ?? "",
      ].join(" ")}
    >
      {OPTIONS.map((option) => {
        const active = current === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            title={`Switch to ${option.label} palette`}
            onClick={() => setPalette(option.id)}
            className={[
              "rounded-full font-mono uppercase tracking-[0.08em] transition-colors",
              compact ? "px-2 py-[3px] text-[10px]" : "px-3 py-[5px] text-[11px]",
              active
                ? "bg-foreground text-background"
                : "text-fg-subtle hover:text-foreground",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
