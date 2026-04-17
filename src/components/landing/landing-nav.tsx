"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";

import { WeaveMark } from "@/components/weave-mark";

export function LandingNav() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-border backdrop-blur"
      style={{
        background: "color-mix(in oklch, var(--paper) 82%, transparent)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-6 px-6">
        <Link href="/welcome" className="flex items-center gap-2 text-foreground">
          <WeaveMark size={22} weight={1.6} className="text-brand" />
          <span className="font-serif text-[20px] font-light tracking-[-0.02em]">
            weave<span className="italic text-brand">Drop</span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-6 text-[13px] text-fg-muted md:flex">
          <a href="#product" className="hover:text-foreground">Product</a>
          <a href="#canvas" className="hover:text-foreground">The canvas</a>
          <a href="#for-who" className="hover:text-foreground">For whom</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a
            href="#changelog"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--moss)" }}
            />
            Changelog
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Show when="signed-in">
            <Link
              href="/"
              className="btn-primary inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-4 text-[13px]"
            >
              Open app <ArrowRight className="h-3 w-3" />
            </Link>
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal" fallbackRedirectUrl="/">
              <button
                type="button"
                className="btn-ghost inline-flex h-9 items-center whitespace-nowrap rounded-md px-3 text-[13px]"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal" fallbackRedirectUrl="/">
              <button
                type="button"
                className="btn-primary inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-4 text-[13px]"
              >
                Get started <ArrowRight className="h-3 w-3" />
              </button>
            </SignUpButton>
          </Show>
        </div>
      </div>
    </header>
  );
}
