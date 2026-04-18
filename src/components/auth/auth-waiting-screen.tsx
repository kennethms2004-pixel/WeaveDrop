import { Loader2 } from "lucide-react";

import { WeaveMark } from "@/components/weave-mark";

/** Loom palette anchors (match weave-tokens.css) — independent of document palette. */
const LOOM_PAPER = "oklch(0.972 0.012 78)";
const LOOM_INK = "oklch(0.215 0.018 55)";
const LOOM_INK_SUBTLE = "oklch(0.56 0.018 60)";
const LOOM_BRAND = "oklch(0.48 0.12 265)";
const LOOM_RULE = "oklch(0.86 0.015 70)";

/**
 * Full-screen shell shown while Clerk.js / session is initializing.
 * Uses Loom (cream) visuals so sign-in never lands on a stray dark frame.
 */
export function AuthWaitingScreen() {
  return (
    <div
      className="fixed inset-0 z-[200000] flex flex-col items-center justify-center gap-8 px-6"
      style={{
        background: LOOM_PAPER,
        color: LOOM_INK,
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Signing you in"
    >
      <div
        className="flex flex-col items-center gap-5 text-center"
        style={{ maxWidth: "28rem" }}
      >
        <div
          className="inline-flex items-baseline gap-1.5 font-serif font-light tracking-[-0.02em]"
          style={{ fontSize: "22px", lineHeight: 1, color: LOOM_INK }}
        >
          <WeaveMark
            size={22}
            weight={1.5}
            className="shrink-0"
            style={{ color: LOOM_BRAND, position: "relative", top: 2 }}
          />
          <span>weave</span>
          <span className="italic" style={{ color: LOOM_BRAND }}>
            Drop
          </span>
        </div>

        <div
          className="w-full max-w-[220px]"
          style={{
            height: 1,
            background: `repeating-linear-gradient(90deg, ${LOOM_INK_SUBTLE} 0 3px, transparent 3px 9px)`,
            opacity: 0.55,
          }}
        />

        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: LOOM_BRAND }}
            aria-hidden
          />
          <p
            className="font-mono text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{ color: LOOM_INK_SUBTLE }}
          >
            Signing you in
          </p>
          <p className="text-[14px] leading-relaxed" style={{ color: LOOM_INK_SUBTLE }}>
            One moment while we connect your session.
          </p>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: [
            "repeating-linear-gradient(110deg, transparent 0 14px, color-mix(in oklch, black 4%, transparent) 14px 15px)",
            "repeating-linear-gradient(-70deg, transparent 0 22px, color-mix(in oklch, black 3%, transparent) 22px 23px)",
          ].join(","),
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
        style={{ background: LOOM_RULE }}
        aria-hidden
      />
    </div>
  );
}
