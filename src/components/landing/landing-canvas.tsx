import type { CSSProperties } from "react";

type CanvasCardProps = {
  style: CSSProperties;
  kicker: string;
  title: string;
  body: string;
  tint?: "brand" | "muted";
};

function CanvasCard({ style, kicker, title, body, tint }: CanvasCardProps) {
  const borderColor =
    tint === "brand"
      ? "var(--brand)"
      : tint === "muted"
        ? "color-mix(in oklch, var(--brand) 38%, var(--rule))"
        : "var(--rule)";
  return (
    <div
      className="absolute rounded-md border bg-card p-3 text-left"
      style={{ ...style, borderColor, boxShadow: "var(--shadow-2)" }}
    >
      <span className="mono-label">{kicker}</span>
      <p className="mt-1 font-serif text-[13px] leading-tight text-foreground">
        {title}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-fg-subtle">{body}</p>
    </div>
  );
}

/**
 * Schematic canvas preview used by the hero and gallery variants. All shapes
 * are original CSS/SVG — no screenshots of third-party UI.
 */
export function LandingCanvas({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className="weave-panel relative overflow-hidden"
      style={{
        boxShadow: "var(--shadow-3)",
        aspectRatio: wide ? "16 / 9" : "4 / 5",
      }}
    >
      <div
        aria-hidden="true"
        className="hero-fiber absolute inset-0 opacity-60"
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: "var(--terracotta)" }}
          />
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: "color-mix(in oklch, var(--brand) 55%, var(--rule))" }}
          />
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: "var(--moss)" }}
          />
          <span className="mono-label ml-3">Research on agents · 24 nodes</span>
          <span className="mono-label ml-auto">canvas</span>
        </div>

        <div className="relative flex-1">
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 400 300"
            preserveAspectRatio="none"
          >
            <path
              d="M70 80 C 140 80, 160 160, 230 160"
              fill="none"
              stroke="var(--ink-3)"
              strokeWidth="1"
              strokeDasharray="3 5"
              opacity="0.45"
            />
            <path
              d="M230 160 C 290 160, 290 230, 340 230"
              fill="none"
              stroke="var(--ink-3)"
              strokeWidth="1"
              strokeDasharray="3 5"
              opacity="0.45"
            />
            <path
              d="M70 80 C 120 120, 180 230, 340 230"
              fill="none"
              stroke="var(--ink-3)"
              strokeWidth="1"
              strokeDasharray="3 5"
              opacity="0.25"
            />
          </svg>

          <CanvasCard
            style={{ left: "4%", top: "8%", width: "38%" }}
            kicker="Note"
            title="Agent loops and bounded autonomy"
            body="Short tasks; verification before long chains."
          />
          <CanvasCard
            style={{ left: "40%", top: "38%", width: "36%" }}
            kicker="Source"
            title="Park et al. — generative agents"
            body="open in tab · arxiv 2304.03442"
            tint="muted"
          />
          <CanvasCard
            style={{ left: "58%", top: "66%", width: "36%" }}
            kicker="Draft"
            title="Outline — section 3"
            body="Scope, interventions, evaluation frame."
            tint="brand"
          />
        </div>
      </div>
    </div>
  );
}
