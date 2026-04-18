"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  applyPaletteToDocument,
  resolveBootstrapPalette,
} from "@/lib/use-palette";

function isWelcomePath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/welcome" || pathname.startsWith("/welcome/");
}

/**
 * Landing is always light (loom), including signed-in users on thread/dark.
 * While Clerk is still loading a session (e.g. after OAuth redirect), keep Loom
 * so users never see a half-hydrated dark frame. After leaving /welcome and once
 * Clerk is ready, restores palette from storage/OS without writing storage.
 * Keeps client navigations in sync with the beforeInteractive bootstrap.
 */
export function WelcomePaletteGate() {
  const pathname = usePathname();
  const { isLoaded } = useAuth();
  const onWelcome = isWelcomePath(pathname);

  useEffect(() => {
    if (onWelcome) {
      applyPaletteToDocument("loom");
      return;
    }
    if (!isLoaded) {
      applyPaletteToDocument("loom");
      return;
    }
    applyPaletteToDocument(resolveBootstrapPalette());
  }, [isLoaded, onWelcome, pathname]);

  return null;
}
