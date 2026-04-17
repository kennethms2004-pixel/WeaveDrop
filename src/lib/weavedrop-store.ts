"use client";

import type { Edge, Node } from "@xyflow/react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type BrainListItem = {
  id: string;
  name: string;
  nodeCount: number;
};

type GraphState = {
  edges: Edge[];
  nodes: Node[];
};

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/gu, "")}`;
}

function countNodes(nodes: Node[]) {
  return nodes.length;
}

export type WeaveDropStore = {
  brains: BrainListItem[];
  graphs: Record<string, GraphState>;
  listBrains: () => BrainListItem[];
  createBrain: (name: string) => BrainListItem;
  deleteBrain: (brainId: string) => void;
  getGraph: (brainId: string) => GraphState;
  syncBrainCounts: () => void;
};

export const useWeaveDropStore = create<WeaveDropStore>()(
  persist(
    (set, get) => ({
      brains: [],
      graphs: {},

      syncBrainCounts: () => {
        set((state) => ({
          brains: state.brains.map((brain) => ({
            ...brain,
            nodeCount: countNodes(state.graphs[brain.id]?.nodes ?? []),
          })),
        }));
      },

      listBrains: () => get().brains,

      createBrain: (name) => {
        const id = newId("brain");
        const brain: BrainListItem = {
          id,
          name: name.trim() || "Untitled brain",
          nodeCount: 0,
        };

        set((state) => ({
          brains: [brain, ...state.brains],
          graphs: {
            ...state.graphs,
            [id]: { edges: [], nodes: [] },
          },
        }));

        return brain;
      },

      deleteBrain: (brainId) => {
        set((state) => {
          const graphs = { ...state.graphs };
          delete graphs[brainId];

          return {
            brains: state.brains.filter((brain) => brain.id !== brainId),
            graphs,
          };
        });
      },

      getGraph: (brainId) => {
        const graph = get().graphs[brainId];

        return graph ?? { edges: [], nodes: [] };
      },
    }),
    {
      name: "weavedrop-shell-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        brains: state.brains,
        graphs: state.graphs,
      }),
    },
  ),
);
