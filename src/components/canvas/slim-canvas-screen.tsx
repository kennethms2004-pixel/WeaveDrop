"use client";

import "@xyflow/react/dist/style.css";

import { useMemo } from "react";
import type { Edge, Node } from "@xyflow/react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";

type SlimCanvasScreenProps = {
  brainId: string;
  brainName: string;
};

export function SlimCanvasScreen({ brainId, brainName }: SlimCanvasScreenProps) {
  const nodes = useMemo<Node[]>(() => [], []);
  const edges = useMemo<Edge[]>(() => [], []);

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col"
      role="application"
      aria-label={`Canvas for ${brainName}`}
    >
      <ReactFlowProvider>
        <div className="min-h-0 flex-1">
          <ReactFlow
            key={brainId}
            nodes={nodes}
            edges={edges}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnScroll
            zoomOnScroll
            zoomOnPinch
            minZoom={0.15}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="rgba(255,255,255,0.06)" gap={20} size={1} />
            <MiniMap
              maskColor="rgba(0,0,0,0.5)"
              style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
            />
            <Controls
              className="[&_button]:border-white/10 [&_button]:bg-[#2a2f38] [&_button]:fill-white"
              showInteractive={false}
            />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </div>
  );
}
