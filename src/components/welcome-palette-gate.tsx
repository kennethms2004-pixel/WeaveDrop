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
 * Landing stays light; palette choice applies only after leaving /welcome.
 * Keeps SPA navigations in sync with the beforeInteractive bootstrap script.
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
