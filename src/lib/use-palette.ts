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
  document.documentElement.dataset.palette = next;
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, next);
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
  window.dispatchEvent(new CustomEvent<Palette>(PALETTE_EVENT, { detail: next }));
}
