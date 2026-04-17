"use client";

import "@xyflow/react/dist/style.css";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type {
  Connection,
  Edge as RFEdge,
  EdgeChange,
  Node as RFNode,
  NodeChange,
} from "@xyflow/react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";

import { createEdge, deleteEdge } from "@/lib/actions/edge.actions";
import { deleteNode, updateNode } from "@/lib/actions/node.actions";
import type { EdgeDTO, NodeDTO } from "@/lib/actions/dto";
import { usePalette } from "@/lib/use-palette";

type SlimCanvasScreenProps = {
  brainId: string;
  brainName: string;
  initialNodes: NodeDTO[];
  initialEdges: EdgeDTO[];
};

const POSITION_DEBOUNCE_MS = 400;

function nodeDtoToFlow(dto: NodeDTO): RFNode {
  return {
    id: dto.id,
    type: "default",
    position: dto.position,
    data: {
      label: resolveLabel(dto),
      kind: dto.type,
      status: dto.status,
      ...dto.data,
    },
    ...(dto.size ? { width: dto.size.width, height: dto.size.height } : {}),
  };
}

function edgeDtoToFlow(dto: EdgeDTO): RFEdge {
  return {
    id: dto.id,
    source: dto.sourceNodeId,
    target: dto.targetNodeId,
    ...(dto.sourceHandle ? { sourceHandle: dto.sourceHandle } : {}),
    ...(dto.targetHandle ? { targetHandle: dto.targetHandle } : {}),
  };
}

function resolveLabel(dto: NodeDTO): string {
  const title =
    typeof dto.data?.title === "string" ? (dto.data.title as string) : null;
  const text =
    typeof dto.data?.text === "string" ? (dto.data.text as string) : null;

  if (title) return title;
  if (text) return text.length > 40 ? `${text.slice(0, 40)}…` : text;

  switch (dto.type) {
    case "source":
      return "Source";
    case "note":
      return "Note";
    case "chat":
      return "Chat";
    default:
      return "Node";
  }
}

export function SlimCanvasScreen({
  brainId,
  brainName,
  initialNodes,
  initialEdges,
}: SlimCanvasScreenProps) {
  // The parent page remounts this component with `key={brainId}` on route
  // change, so these initializers run fresh per brain — no need to sync
  // `initialNodes`/`initialEdges` back into state via effects.
  const [nodes, setNodes] = useState<RFNode[]>(() =>
    initialNodes.map(nodeDtoToFlow),
  );
  const [edges, setEdges] = useState<RFEdge[]>(() =>
    initialEdges.map(edgeDtoToFlow),
  );

  const router = useRouter();

  const [, startTransition] = useTransition();
  const positionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const schedulePositionPersist = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      const existing = positionTimers.current.get(nodeId);
      if (existing) {
        clearTimeout(existing);
      }

      const timer = setTimeout(() => {
        positionTimers.current.delete(nodeId);
        startTransition(() => {
          updateNode({ nodeId, position }).catch((error) => {
            console.error("[canvas] updateNode failed", error);
          });
        });
      }, POSITION_DEBOUNCE_MS);

      positionTimers.current.set(nodeId, timer);
    },
    [],
  );

  const cancelScheduledPositionPersist = useCallback((nodeId: string) => {
    const existing = positionTimers.current.get(nodeId);
    if (existing) {
      clearTimeout(existing);
      positionTimers.current.delete(nodeId);
    }
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removedById = new Map<string, RFNode>();

      setNodes((current) => {
        for (const change of changes) {
          if (change.type === "remove") {
            const node = current.find((n) => n.id === change.id);
            if (node) {
              removedById.set(change.id, { ...node });
            }
          }
        }
        return applyNodeChanges(changes, current);
      });

      const removedNodeIds = new Set<string>();
      for (const change of changes) {
        if (change.type === "remove") {
          removedNodeIds.add(change.id);
          cancelScheduledPositionPersist(change.id);
        }
      }

      for (const change of changes) {
        if (
          change.type === "position" &&
          change.position &&
          !change.dragging &&
          !removedNodeIds.has(change.id)
        ) {
          schedulePositionPersist(change.id, change.position);
        }
        if (change.type === "remove") {
          const snapshot = removedById.get(change.id);
          startTransition(() => {
            deleteNode(change.id).catch((error) => {
              console.error("[canvas] deleteNode failed", error);
              if (snapshot) {
                setNodes((current) =>
                  current.some((n) => n.id === snapshot.id)
                    ? current
                    : [...current, snapshot],
                );
              } else {
                router.refresh();
              }
            });
          });
        }
      }
    },
    [cancelScheduledPositionPersist, router, schedulePositionPersist],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removedById = new Map<string, RFEdge>();

      setEdges((current) => {
        for (const change of changes) {
          if (change.type === "remove") {
            const edge = current.find((e) => e.id === change.id);
            if (edge) {
              removedById.set(change.id, { ...edge });
            }
          }
        }
        return applyEdgeChanges(changes, current);
      });

      for (const change of changes) {
        if (change.type === "remove") {
          const snapshot = removedById.get(change.id);
          startTransition(() => {
            deleteEdge(change.id).catch((error) => {
              console.error("[canvas] deleteEdge failed", error);
              if (snapshot) {
                setEdges((current) =>
                  current.some((e) => e.id === snapshot.id)
                    ? current
                    : [...current, snapshot],
                );
              } else {
                router.refresh();
              }
            });
          });
        }
      }
    },
    [router],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      startTransition(() => {
        createEdge({
          brainId,
          sourceNodeId: connection.source as string,
          targetNodeId: connection.target as string,
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
        })
          .then((created) => {
            setEdges((current) => [
              ...current.filter((e) => {
                const sameEndpoints =
                  e.source === created.sourceNodeId &&
                  e.target === created.targetNodeId;
                const sameHandles =
                  (e.sourceHandle ?? null) === (created.sourceHandle ?? null) &&
                  (e.targetHandle ?? null) === (created.targetHandle ?? null);
                return !(sameEndpoints && sameHandles);
              }),
              edgeDtoToFlow(created),
            ]);
          })
          .catch((error) => {
            console.error("[canvas] createEdge failed", error);
          });
      });
    },
    [brainId],
  );

  useEffect(() => {
    const timers = positionTimers.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const initialSnapshot = useMemo(
    () => ({ brainId, brainName }),
    [brainId, brainName],
  );

  const palette = usePalette();
  const isThread = palette === "thread";
  const backgroundDotColor = isThread
    ? "rgba(255,255,255,0.06)"
    : "rgba(30,18,6,0.08)";
  const miniMapMaskColor = isThread ? "rgba(0,0,0,0.5)" : "rgba(30,18,6,0.18)";
  const miniMapBgColor = isThread ? "rgba(0,0,0,0.35)" : "rgba(255,244,230,0.7)";

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col"
      role="application"
      aria-label={`Canvas for ${initialSnapshot.brainName}`}
    >
      <ReactFlowProvider>
        <div className="min-h-0 flex-1">
          <ReactFlow
            key={initialSnapshot.brainId}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            panOnScroll
            zoomOnScroll
            zoomOnPinch
            minZoom={0.15}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background color={backgroundDotColor} gap={20} size={1} />
            <MiniMap
              maskColor={miniMapMaskColor}
              style={{ backgroundColor: miniMapBgColor }}
            />
            <Controls
              className="[&_button]:border-border [&_button]:bg-card [&_button]:fill-foreground [&_button]:text-foreground"
              showInteractive={false}
            />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </div>
  );
}
