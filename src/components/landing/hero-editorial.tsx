"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";

import { LandingCanvas } from "./landing-canvas";

export function HeroEditorial() {
  return (
    <section
      id="product"
      className="relative overflow-hidden border-b border-border"
    >
      <div
        aria-hidden="true"
        className="hero-fiber pointer-events-none absolute inset-0 opacity-70"
      />
      <div className="relative mx-auto grid max-w-[1240px] gap-10 px-6 py-20 md:grid-cols-[1.05fr_0.95fr] md:py-28 lg:gap-16">
        <div className="flex flex-col justify-center">
          <span className="mono-label">WeaveDrop · early access</span>
          <h1
            className="mt-5 font-serif font-light leading-[1.02] tracking-[-0.02em] text-foreground"
            style={{ fontSize: "clamp(44px, 6.2vw, 88px)" }}
          >
            Think in{" "}
            <span className="italic" style={{ color: "var(--brand)" }}>
              canvases
            </span>
            ,{" "}
            <br className="hidden md:block" />
            not chat windows.
          </h1>
          <p className="mt-6 max-w-[56ch] text-[17px] leading-relaxed text-fg-muted">
            WeaveDrop is a quiet workspace for serious research. Weave
            long-running context across sessions, drop sources and drafts onto
            a canvas, and let agents collaborate where your thinking already
            lives — a loom for ideas rather than a feed for prompts.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
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
                  Sign in
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

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="weave-chip">Canvas‑first</span>
            <span className="weave-chip">Persistent memory</span>
            <span className="weave-chip">Agent‑ready</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-6 top-8 hidden h-[88%] border-l border-dashed border-border md:block" />
          <LandingCanvas />
        </div>
      </div>
    </section>
  );
}
