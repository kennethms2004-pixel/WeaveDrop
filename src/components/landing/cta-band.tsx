"use client";

import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";

export function CtaBand() {
  return (
    <section
      id="pricing"
      className="relative overflow-hidden border-b border-border"
    >
      <div
        aria-hidden="true"
        className="hero-fiber pointer-events-none absolute inset-0 opacity-60"
      />
      <div className="relative mx-auto max-w-[1040px] px-6 py-20 text-center md:py-28">
        <span className="mono-label">Start</span>
        <h2 className="mt-5 font-serif text-[44px] font-light leading-[1.05] tracking-[-0.02em] text-foreground md:text-[64px]">
          A quieter place to{" "}
          <span className="italic" style={{ color: "var(--brand)" }}>
            think
          </span>
          .
        </h2>
        <p className="mx-auto mt-5 max-w-[56ch] text-[16px] leading-relaxed text-fg-muted">
          WeaveDrop is in early access. Create your workspace now — keep your
          canvases, bring your agents, and leave the chat scroll behind.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Show when="signed-out">
            <SignUpButton mode="modal" fallbackRedirectUrl="/">
              <button
                type="button"
                className="btn-primary inline-flex h-11 items-center gap-1.5 rounded-md px-5 text-[14px]"
              >
                Create your workspace <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </SignUpButton>
            <SignInButton mode="modal" fallbackRedirectUrl="/">
              <button
                type="button"
                className="btn-secondary inline-flex h-11 items-center rounded-md px-5 text-[14px]"
              >
                I already have an account
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/"
              className="btn-primary inline-flex h-11 items-center gap-1.5 rounded-md px-5 text-[14px]"
            >
              Open your canvas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Show>
        </div>

        <p className="mt-6 inline-flex items-center gap-2 text-[12px] text-fg-subtle">
          <Lock className="h-3 w-3" />
          Private by default · your canvases are yours
        </p>
      </div>
    </section>
  );
}
