"use client";

import { useSyncExternalStore } from "react";

import {
  DEFAULT_PALETTE,
  PALETTE_STORAGE_KEY,
  type Palette,
} from "@/lib/brand";

export const PALETTE_EVENT = "weavedrop:palette-change";

function readPalette(): Palette {
  if (typeof document === "undefined") {
    return DEFAULT_PALETTE;
  }
  const current = document.documentElement.dataset.palette;
  if (current === "loom" || current === "thread") {
    return current;
  }
  return DEFAULT_PALETTE;
}

function subscribe(callback: () => void) {
  window.addEventListener(PALETTE_EVENT, callback);
  return () => {
    window.removeEventListener(PALETTE_EVENT, callback);
  };
}

export function usePalette(): Palette {
  return useSyncExternalStore(subscribe, readPalette, () => DEFAULT_PALETTE);
}

export function setPalette(next: Palette) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.palette = next;
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, next);
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
  window.dispatchEvent(new CustomEvent<Palette>(PALETTE_EVENT, { detail: next }));
}
