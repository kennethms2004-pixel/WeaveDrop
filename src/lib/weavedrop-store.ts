"use client";

import { create } from "zustand";

/**
 * Client-only UI state for WeaveDrop.
 *
 * All durable data (brains, nodes, edges, chats, ingestions) lives in MongoDB
 * and is fetched through server actions. This store is strictly for transient
 * canvas UI (selection and hover) that does not need
 * to survive across sessions or users.
 */
export type WeaveDropUIStore = {
  selectedNodeId: string | null;
  setSelectedNodeId: (nodeId: string | null) => void;

  hoveredNodeId: string | null;
  setHoveredNodeId: (nodeId: string | null) => void;

  reset: () => void;
};

export const useWeaveDropStore = create<WeaveDropUIStore>()((set) => ({
  selectedNodeId: null,
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),

  hoveredNodeId: null,
  setHoveredNodeId: (hoveredNodeId) => set({ hoveredNodeId }),

  reset: () => set({ selectedNodeId: null, hoveredNodeId: null }),
}));
