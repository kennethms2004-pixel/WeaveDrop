"use client";

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
 * After leaving /welcome, restores palette from storage/OS without writing storage.
 * Keeps client navigations in sync with the beforeInteractive bootstrap.
 */
export function WelcomePaletteGate() {
  const pathname = usePathname();
  const onWelcome = isWelcomePath(pathname);

  useEffect(() => {
    if (onWelcome) {
      applyPaletteToDocument("loom");
    } else {
      applyPaletteToDocument(resolveBootstrapPalette());
    }
  }, [onWelcome, pathname]);

  return null;
}
