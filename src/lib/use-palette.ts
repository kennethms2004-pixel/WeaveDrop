"use client";

import { useSyncExternalStore } from "react";

import {
  DEFAULT_PALETTE,
  PALETTE_STORAGE_KEY,
  type Palette,
} from "@/lib/brand";

export const PALETTE_EVENT = "weavedrop:palette-change";

/** DOM + hook sync only (no localStorage). Matches inline bootstrap when not persisting. */
export function applyPaletteToDocument(next: Palette) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.palette = next;
  window.dispatchEvent(new CustomEvent<Palette>(PALETTE_EVENT, { detail: next }));
}

/** Resolve palette from stored choice, else OS preference, else brand default. */
export function resolveBootstrapPalette(): Palette {
  if (typeof window === "undefined") {
    return DEFAULT_PALETTE;
  }
  try {
    const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (stored === "loom" || stored === "thread") {
      return stored;
    }
  } catch {
    /* ignore */
  }
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "thread";
  }
  return DEFAULT_PALETTE;
}

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
  function onPaletteEvent() {
    callback();
  }
  function onStorage(event: StorageEvent) {
    if (event.key !== PALETTE_STORAGE_KEY) {
      return;
    }
    const next = event.newValue;
    if (next === "loom" || next === "thread") {
      document.documentElement.dataset.palette = next;
    } else if (next === null) {
      document.documentElement.dataset.palette = DEFAULT_PALETTE;
    } else {
      return;
    }
    callback();
  }
  window.addEventListener(PALETTE_EVENT, onPaletteEvent);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PALETTE_EVENT, onPaletteEvent);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePalette(): Palette {
  return useSyncExternalStore(subscribe, readPalette, () => DEFAULT_PALETTE);
}

export function setPalette(next: Palette) {
  if (typeof document === "undefined") return;
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, next);
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
  applyPaletteToDocument(next);
}
