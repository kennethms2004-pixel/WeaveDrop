"use client";

import "@xyflow/react/dist/style.css";

import {
  Database,
  FileText,
  MessageSquare,
  Plus,
  Search,
  Send,
  X,
  type LucideIcon,
} from "lucide-react";
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
  ReactFlowInstance,
} from "@xyflow/react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  ViewportPortal,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";

import { appendChatMessage, listMessagesForChatNode } from "@/lib/actions/chat.actions";
import { createEdge, deleteEdge } from "@/lib/actions/edge.actions";
import { createNode, deleteNode, updateNode } from "@/lib/actions/node.actions";
import type { ChatMessageDTO, EdgeDTO, NodeDTO } from "@/lib/actions/dto";
import type { ChatRole, NodeType, SourceStatus } from "@/types/db";
import { usePalette } from "@/lib/use-palette";
import { ChatNode } from "@/components/canvas/nodes/chat-node";
import { NoteNode } from "@/components/canvas/nodes/note-node";
import type {
  ChatContextSummary,
  LatestMessagePreview,
} from "@/components/canvas/nodes/types";

type SlimCanvasScreenProps = {
  brainId: string;
  brainName: string;
  initialNodes: NodeDTO[];
  initialEdges: EdgeDTO[];
};

type CanvasNodeData = {
  label: string;
  kind: NodeType;
  status: SourceStatus | null;
  title: string;
  text: string;
  latestMessagePreview: LatestMessagePreview;
};

type CanvasNode = RFNode<CanvasNodeData>;

type SidePanelState =
  | { type: "add" }
  | { type: "chat"; nodeId: string }
  | null;

const POSITION_DEBOUNCE_MS = 400;
const NODE_DATA_DEBOUNCE_MS = 500;
const ADD_PANEL_ID = "canvas-add-node-panel";
const CHAT_PANEL_ID = "canvas-chat-panel";

const EMPTY_CHAT_MESSAGES: ChatMessageDTO[] = [];

const NODE_WIDTHS: Record<NodeType, number> = {
  note: 360,
  chat: 440,
  source: 280,
};

const ADD_PANEL_NODES: Array<{
  id: NodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
}> = [
  {
    id: "note",
    label: "Note",
    description: "Write, pin, and reorganize working thoughts on the canvas.",
    icon: FileText,
    enabled: true,
  },
  {
    id: "chat",
    label: "Chat",
    description: "Keep a live thread attached to the work happening here.",
    icon: MessageSquare,
    enabled: true,
  },
  {
    id: "source",
    label: "Source",
    description: "Bring in material you want to read, cite, or keep nearby.",
    icon: Database,
    enabled: false,
  },
];

function getNodeTitle(data: Record<string, unknown>): string {
  return typeof data.title === "string" ? data.title : "";
}

function getNodeText(data: Record<string, unknown>): string {
  return typeof data.text === "string" ? data.text : "";
}

function getLatestMessagePreview(
  data: Record<string, unknown>,
): LatestMessagePreview {
  const candidate = data.latestMessagePreview;
  if (
    candidate &&
    typeof candidate === "object" &&
    "role" in candidate &&
    "content" in candidate &&
    typeof candidate.role === "string" &&
    typeof candidate.content === "string"
  ) {
    const role = candidate.role as ChatRole;
    if (role === "user" || role === "assistant" || role === "system") {
      return { role, content: candidate.content };
    }
  }
  return null;
}

function resolveFlowNodeType(kind: NodeType): string {
  return kind === "source" ? "default" : kind;
}

function labelFromNodeData(
  type: NodeType,
  data: Record<string, unknown>,
): string {
  const title = getNodeTitle(data);
  const text = getNodeText(data);

  if (title) return title;
  if (text) return text.length > 40 ? `${text.slice(0, 40)}…` : text;

  switch (type) {
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

function resolveLabel(dto: NodeDTO): string {
  return labelFromNodeData(dto.type, dto.data);
}

function nodeDtoToFlow(dto: NodeDTO): CanvasNode {
  return {
    id: dto.id,
    type: resolveFlowNodeType(dto.type),
    position: dto.position,
    data: {
      label: resolveLabel(dto),
      kind: dto.type,
      status: dto.status,
      title: getNodeTitle(dto.data),
      text: getNodeText(dto.data),
      latestMessagePreview: getLatestMessagePreview(dto.data),
    },
    style: {
      width: dto.size?.width ?? NODE_WIDTHS[dto.type],
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

function summarizeChatContext(
  nodeId: string,
  nodes: CanvasNode[],
  edges: RFEdge[],
): ChatContextSummary {
  const incoming = edges.filter((edge) => edge.target === nodeId);
  let connectedNotes = 0;
  let connectedReady = 0;
  let connectedProcessing = 0;
  let connectedFailed = 0;

  for (const edge of incoming) {
    const sourceNode = nodes.find((node) => node.id === edge.source);
    if (!sourceNode) {
      continue;
    }

    if (sourceNode.data.kind === "note") {
      connectedNotes += 1;
      continue;
    }

    if (sourceNode.data.kind === "source") {
      if (sourceNode.data.status === "processing") {
        connectedProcessing += 1;
      } else if (sourceNode.data.status === "failed") {
        connectedFailed += 1;
      } else {
        connectedReady += 1;
      }
    }
  }

  const total =
    connectedNotes + connectedReady + connectedProcessing + connectedFailed;

  if (total === 0) {
    return { label: "No context connected", tone: "muted" };
  }

  if (connectedProcessing > 0) {
    return {
      label: `${connectedProcessing} source${connectedProcessing > 1 ? "s" : ""} processing`,
      tone: "warn",
    };
  }

  if (connectedFailed > 0) {
    return {
      label: `${connectedFailed} unavailable`,
      tone: "fail",
    };
  }

  if (connectedReady === 0 && connectedNotes > 0) {
    return {
      label: `Notes only · ${connectedNotes}`,
      tone: "neutral",
    };
  }

  if (connectedReady > 0 && connectedNotes === 0) {
    return {
      label: `${connectedReady} source${connectedReady > 1 ? "s" : ""} ready`,
      tone: "ok",
    };
  }

  return {
    label: `Mixed · ${connectedReady} source · ${connectedNotes} note${connectedNotes > 1 ? "s" : ""}`,
    tone: "neutral",
  };
}

function messagePreviewFromMessage(
  message: Pick<ChatMessageDTO, "role" | "content">,
): LatestMessagePreview {
  return {
    role: message.role,
    content: message.content,
  };
}

export function SlimCanvasScreen({
  brainId,
  brainName,
  initialNodes,
  initialEdges,
}: SlimCanvasScreenProps) {
  const [nodes, setNodes] = useState<CanvasNode[]>(() =>
    initialNodes.map(nodeDtoToFlow),
  );
  const [edges, setEdges] = useState<RFEdge[]>(() =>
    initialEdges.map(edgeDtoToFlow),
  );
  const [sidePanel, setSidePanel] = useState<SidePanelState>(null);
  const [nodeSearch, setNodeSearch] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessagesByNode, setChatMessagesByNode] = useState<
    Record<string, ChatMessageDTO[]>
  >({});
  const [chatLoadingNodeId, setChatLoadingNodeId] = useState<string | null>(
    null,
  );
  const [sendingChatNodeId, setSendingChatNodeId] = useState<string | null>(
    null,
  );
  const [savingNoteIds, setSavingNoteIds] = useState<string[]>([]);

  const router = useRouter();
  const [, startTransition] = useTransition();
  const positionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const notePersistTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const reactFlowRef = useRef<ReactFlowInstance<CanvasNode, RFEdge> | null>(
    null,
  );
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const chatComposerRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const activeChatNodeId =
    sidePanel?.type === "chat" ? sidePanel.nodeId : null;

  const activeChatMessages = useMemo(
    () =>
      activeChatNodeId
        ? chatMessagesByNode[activeChatNodeId] ?? EMPTY_CHAT_MESSAGES
        : EMPTY_CHAT_MESSAGES,
    [activeChatNodeId, chatMessagesByNode],
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
            console.error("[canvas] updateNode position failed", error);
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

  const markNoteSaving = useCallback((nodeId: string, isSaving: boolean) => {
    setSavingNoteIds((current) => {
      if (isSaving) {
        return current.includes(nodeId) ? current : [...current, nodeId];
      }
      return current.filter((id) => id !== nodeId);
    });
  }, []);

  const cancelNotePersist = useCallback(
    (nodeId: string) => {
      const existing = notePersistTimers.current.get(nodeId);
      if (existing) {
        clearTimeout(existing);
        notePersistTimers.current.delete(nodeId);
      }
      markNoteSaving(nodeId, false);
    },
    [markNoteSaving],
  );

  const scheduleNotePersist = useCallback(
    (nodeId: string, payload: { title: string; text: string }) => {
      const existing = notePersistTimers.current.get(nodeId);
      if (existing) {
        clearTimeout(existing);
      }

      markNoteSaving(nodeId, true);

      const timer = setTimeout(() => {
        notePersistTimers.current.delete(nodeId);

        startTransition(() => {
          updateNode({ nodeId, data: payload })
            .then((updated) => {
              setNodes((current) =>
                current.map((node) =>
                  node.id === nodeId
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          title: getNodeTitle(updated.data),
                          text: getNodeText(updated.data),
                          label: resolveLabel(updated),
                        },
                      }
                    : node,
                ),
              );
            })
            .catch((error) => {
              console.error("[canvas] updateNode note data failed", error);
              router.refresh();
            })
            .finally(() => {
              markNoteSaving(nodeId, false);
            });
        });
      }, NODE_DATA_DEBOUNCE_MS);

      notePersistTimers.current.set(nodeId, timer);
    },
    [markNoteSaving, router],
  );

  const handleNoteChange = useCallback(
    (nodeId: string, patch: { title?: string; text?: string }) => {
      let nextPayload: { title: string; text: string } | null = null;

      setNodes((current) =>
        current.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          const updatedData = {
            ...node.data,
            ...patch,
          };

          nextPayload = {
            title:
              typeof updatedData.title === "string" ? updatedData.title : "",
            text: typeof updatedData.text === "string" ? updatedData.text : "",
          };

          return {
            ...node,
            data: {
              ...updatedData,
              label: labelFromNodeData("note", updatedData),
            },
          };
        }),
      );

      if (nextPayload) {
        scheduleNotePersist(nodeId, nextPayload);
      }
    },
    [scheduleNotePersist],
  );

  const openAddPanel = useCallback(() => {
    setNodeSearch("");
    setSidePanel({ type: "add" });
  }, []);

  const openChatPanel = useCallback((nodeId: string) => {
    setChatDraft("");
    if (!chatMessagesByNode[nodeId]) {
      setChatLoadingNodeId(nodeId);
    }
    setSidePanel({ type: "chat", nodeId });
  }, [chatMessagesByNode]);

  const closeSidePanel = useCallback(() => {
    setNodeSearch("");
    setChatDraft("");
    setSidePanel(null);
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removedById = new Map<string, CanvasNode>();

      setNodes((current) => {
        for (const change of changes) {
          if (change.type === "remove") {
            const node = current.find((candidate) => candidate.id === change.id);
            if (node) {
              removedById.set(change.id, { ...node });
            }
          }
        }

        return applyNodeChanges(changes, current) as CanvasNode[];
      });

      const removedNodeIds = new Set<string>();

      for (const change of changes) {
        if (change.type === "remove") {
          removedNodeIds.add(change.id);
          cancelScheduledPositionPersist(change.id);
          cancelNotePersist(change.id);
          setChatMessagesByNode((current) => {
            const next = { ...current };
            delete next[change.id];
            return next;
          });
          if (activeChatNodeId === change.id) {
            closeSidePanel();
          }
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
                  current.some((node) => node.id === snapshot.id)
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
    [
      activeChatNodeId,
      cancelNotePersist,
      cancelScheduledPositionPersist,
      closeSidePanel,
      router,
      schedulePositionPersist,
    ],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removedById = new Map<string, RFEdge>();

      setEdges((current) => {
        for (const change of changes) {
          if (change.type === "remove") {
            const edge = current.find((candidate) => candidate.id === change.id);
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
                  current.some((edge) => edge.id === snapshot.id)
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
          sourceNodeId: connection.source,
          targetNodeId: connection.target,
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
        })
          .then((created) => {
            setEdges((current) => [
              ...current.filter((edge) => {
                const sameEndpoints =
                  edge.source === created.sourceNodeId &&
                  edge.target === created.targetNodeId;
                const sameHandles =
                  (edge.sourceHandle ?? null) === (created.sourceHandle ?? null) &&
                  (edge.targetHandle ?? null) === (created.targetHandle ?? null);
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
    const activePositionTimers = positionTimers.current;
    const activeNoteTimers = notePersistTimers.current;

    return () => {
      for (const timer of activePositionTimers.values()) {
        clearTimeout(timer);
      }
      activePositionTimers.clear();

      for (const timer of activeNoteTimers.values()) {
        clearTimeout(timer);
      }
      activeNoteTimers.clear();
    };
  }, []);

  useEffect(() => {
    if (!sidePanel) {
      return;
    }

    const focusId = window.requestAnimationFrame(() => {
      if (sidePanel.type === "add") {
        searchInputRef.current?.focus();
      }
      if (sidePanel.type === "chat") {
        chatComposerRef.current?.focus();
      }
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSidePanel();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(focusId);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeSidePanel, sidePanel]);

  useEffect(() => {
    if (!activeChatNodeId || chatMessagesByNode[activeChatNodeId]) {
      return;
    }

    listMessagesForChatNode({ chatNodeId: activeChatNodeId, limit: 200 })
      .then((result) => {
        setChatMessagesByNode((current) => ({
          ...current,
          [activeChatNodeId]: result.messages,
        }));
      })
      .catch((error) => {
        console.error("[canvas] load chat messages failed", error);
      })
      .finally(() => {
        setChatLoadingNodeId((current) =>
          current === activeChatNodeId ? null : current,
        );
      });
  }, [activeChatNodeId, chatMessagesByNode]);

  useEffect(() => {
    if (!activeChatNodeId) {
      return;
    }

    const scrollWrap = chatScrollRef.current;
    if (!scrollWrap) {
      return;
    }

    scrollWrap.scrollTop = scrollWrap.scrollHeight;
  }, [activeChatNodeId, activeChatMessages]);

  const palette = usePalette();
  const isThread = palette === "thread";
  const isEmptyCanvas = nodes.length === 0;
  const isAddPanelOpen = sidePanel?.type === "add";

  const backgroundDotColor = isThread
    ? "rgba(255,255,255,0.16)"
    : "rgba(30,18,6,0.22)";
  const miniMapMaskColor = isThread ? "rgba(0,0,0,0.5)" : "rgba(30,18,6,0.18)";
  const miniMapBgColor = isThread ? "rgba(0,0,0,0.35)" : "rgba(255,244,230,0.7)";
  const addButtonSurface = isThread
    ? "color-mix(in oklch, var(--paper-2) 90%, black)"
    : "color-mix(in oklch, var(--paper) 88%, white)";
  const addButtonBorder = isThread
    ? "color-mix(in oklch, var(--ink) 16%, var(--rule))"
    : "color-mix(in oklch, var(--ink) 12%, var(--rule))";
  const emptyCardSurface = isThread
    ? "color-mix(in oklch, var(--paper) 72%, black)"
    : "color-mix(in oklch, var(--paper) 94%, var(--surface))";
  const emptyCardBorder = isThread
    ? "color-mix(in oklch, var(--ink) 28%, var(--rule))"
    : "color-mix(in oklch, var(--ink) 18%, var(--rule))";
  const panelSurface = isThread
    ? "color-mix(in oklch, var(--paper-2) 96%, black)"
    : "var(--surface)";
  const panelShadow = isThread
    ? "0 18px 40px rgba(0,0,0,0.38)"
    : "0 18px 40px rgba(60,30,10,0.14)";

  const filteredAddPanelNodes = useMemo(() => {
    const query = nodeSearch.trim().toLowerCase();
    if (!query) {
      return ADD_PANEL_NODES;
    }
    return ADD_PANEL_NODES.filter((node) => {
      const haystack = `${node.label} ${node.description}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [nodeSearch]);

  const decoratedNodes = useMemo(
    () =>
      nodes.map((node) => {
        if (node.data.kind === "note") {
          return {
            ...node,
            data: {
              ...node.data,
              onChange: (patch: { title?: string; text?: string }) =>
                handleNoteChange(node.id, patch),
              isSaving: savingNoteIds.includes(node.id),
            },
          };
        }

        if (node.data.kind === "chat") {
          return {
            ...node,
            data: {
              ...node.data,
              contextSummary: summarizeChatContext(node.id, nodes, edges),
              onOpen: () => openChatPanel(node.id),
            },
          };
        }

        return node;
      }),
    [edges, handleNoteChange, nodes, openChatPanel, savingNoteIds],
  );

  const nodeTypes = useMemo(
    () => ({
      note: NoteNode,
      chat: ChatNode,
    }),
    [],
  );

  const activeChatNode = useMemo(
    () =>
      activeChatNodeId
        ? nodes.find((node) => node.id === activeChatNodeId) ?? null
        : null,
    [activeChatNodeId, nodes],
  );

  const handleCreateCanvasNode = useCallback(
    (kind: "note" | "chat") => {
      const viewportRect = canvasViewportRef.current?.getBoundingClientRect();
      const flowPosition =
        reactFlowRef.current && viewportRect
          ? reactFlowRef.current.screenToFlowPosition({
              x: viewportRect.left + viewportRect.width / 2,
              y: viewportRect.top + viewportRect.height / 2,
            })
          : { x: 240, y: 180 };

      const width = NODE_WIDTHS[kind];
      const payload =
        kind === "note"
          ? {
              title: "",
              text: "",
            }
          : {
              title: "New chat",
              text: "",
            };

      startTransition(() => {
        createNode({
          brainId,
          type: kind,
          position: {
            x: flowPosition.x - width / 2,
            y: flowPosition.y - 90,
          },
          size: { width },
          data: payload,
        })
          .then((created) => {
            setNodes((current) => [...current, nodeDtoToFlow(created)]);
            closeSidePanel();
          })
          .catch((error) => {
            console.error("[canvas] createNode failed", error);
          });
      });
    },
    [brainId, closeSidePanel],
  );

  const handleSendChatMessage = useCallback(async () => {
    if (!activeChatNodeId) {
      return;
    }

    const content = chatDraft.trim();
    if (!content) {
      return;
    }

    const contextNodeIds = edges
      .filter((edge) => edge.target === activeChatNodeId)
      .map((edge) => edge.source);

    setSendingChatNodeId(activeChatNodeId);

    try {
      const created = await appendChatMessage({
        chatNodeId: activeChatNodeId,
        role: "user",
        content,
        contextNodeIds,
      });

      setChatMessagesByNode((current) => ({
        ...current,
        [activeChatNodeId]: [...(current[activeChatNodeId] ?? []), created],
      }));

      setNodes((current) =>
        current.map((node) =>
          node.id === activeChatNodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  latestMessagePreview: messagePreviewFromMessage(created),
                },
              }
            : node,
        ),
      );

      setChatDraft("");
    } catch (error) {
      console.error("[canvas] appendChatMessage failed", error);
    } finally {
      setSendingChatNodeId((current) =>
        current === activeChatNodeId ? null : current,
      );
    }
  }, [activeChatNodeId, chatDraft, edges]);

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col"
      role="application"
      aria-label={`Canvas for ${brainName}`}
    >
      <ReactFlowProvider>
        <div className="min-h-0 flex-1" ref={canvasViewportRef}>
          <ReactFlow
            edges={edges}
            fitView
            key={brainId}
            maxZoom={1.5}
            minZoom={0.15}
            nodeTypes={nodeTypes}
            nodes={decoratedNodes}
            onConnect={onConnect}
            onEdgesChange={onEdgesChange}
            onInit={(instance) => {
              reactFlowRef.current = instance;
            }}
            onNodesChange={onNodesChange}
            panOnScroll
            proOptions={{ hideAttribution: true }}
            zoomOnPinch
            zoomOnScroll
          >
            <Background color={backgroundDotColor} gap={20} size={2} />
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

        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute top-4 right-4 flex pointer-events-auto">
            <button
              aria-controls={
                sidePanel?.type === "chat" ? CHAT_PANEL_ID : ADD_PANEL_ID
              }
              aria-expanded={Boolean(sidePanel)}
              aria-label="Add node"
              className="flex h-11 w-11 items-center justify-center rounded-md border text-foreground transition hover:scale-[1.01] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              onClick={openAddPanel}
              style={{
                background: addButtonSurface,
                borderColor: addButtonBorder,
                boxShadow: panelShadow,
              }}
              type="button"
            >
              <Plus className="h-5 w-5" strokeWidth={2.1} />
            </button>
          </div>

          {sidePanel?.type === "add" ? (
            <div className="absolute inset-y-0 right-0 flex justify-end p-4">
              <aside
                aria-label="Add node panel"
                className="pointer-events-auto flex h-full w-[360px] max-w-[calc(100vw-7rem)] flex-col overflow-hidden rounded-lg border text-foreground"
                id={ADD_PANEL_ID}
                style={{
                  background: panelSurface,
                  borderColor: addButtonBorder,
                  boxShadow: panelShadow,
                }}
              >
                <div className="flex items-start gap-3 border-b border-border px-5 py-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[26px] leading-[1.05] font-medium tracking-[-0.02em]">
                      Add a node
                    </p>
                    <p className="mt-2 max-w-[28ch] text-[13px] leading-5 text-fg-muted">
                      Start with notes and chats. Sources land next.
                    </p>
                  </div>
                  <button
                    aria-label="Close add node panel"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-fg-muted transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    onClick={closeSidePanel}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="border-b border-border px-5 py-4">
                  <label className="sr-only" htmlFor={`${ADD_PANEL_ID}-search`}>
                    Search nodes
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                    <input
                      className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-3 text-[14px] text-foreground outline-none placeholder:text-fg-subtle focus:border-brand focus:ring-[3px] focus:ring-brand/20"
                      id={`${ADD_PANEL_ID}-search`}
                      onChange={(event) => setNodeSearch(event.target.value)}
                      placeholder="Search nodes..."
                      ref={searchInputRef}
                      type="text"
                      value={nodeSearch}
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                  <div className="space-y-2">
                    {filteredAddPanelNodes.map((node) => {
                      const Icon = node.icon;
                      const isInteractive = node.enabled;

                      return (
                        <button
                          className={`flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left ${
                            isInteractive
                              ? "bg-background transition hover:border-brand/40 hover:bg-brand/5"
                              : "cursor-not-allowed bg-background opacity-70"
                          }`}
                          disabled={!isInteractive}
                          key={node.id}
                          onClick={() => {
                            if (node.id === "note" || node.id === "chat") {
                              handleCreateCanvasNode(node.id);
                            }
                          }}
                          type="button"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-fg-muted">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-medium tracking-[-0.01em] text-foreground">
                              {node.label}
                            </span>
                            <span className="mt-1 block text-[13px] leading-5 text-fg-muted">
                              {node.description}
                            </span>
                          </span>
                          <span className="weave-chip mt-0.5 shrink-0">
                            {isInteractive ? "Add" : "Soon"}
                          </span>
                        </button>
                      );
                    })}

                    {filteredAddPanelNodes.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border bg-background px-4 py-5 text-[13px] leading-5 text-fg-muted">
                        No node options match that search yet.
                      </div>
                    ) : null}
                  </div>
                </div>
              </aside>
            </div>
          ) : null}

          {sidePanel?.type === "chat" && activeChatNode ? (
            <div className="absolute inset-y-0 right-0 flex justify-end p-4">
              <aside
                aria-label="Chat panel"
                className="pointer-events-auto flex h-full w-[420px] max-w-[calc(100vw-7rem)] flex-col overflow-hidden rounded-lg border text-foreground"
                id={CHAT_PANEL_ID}
                style={{
                  background: panelSurface,
                  borderColor: addButtonBorder,
                  boxShadow: panelShadow,
                }}
              >
                <div className="flex items-start gap-3 border-b border-border px-5 py-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[26px] leading-[1.05] font-medium tracking-[-0.02em]">
                      {activeChatNode.data.title || "New chat"}
                    </p>
                    <p className="mt-2 text-[13px] leading-5 text-fg-muted">
                      Full thread view for this canvas chat node.
                    </p>
                  </div>
                  <button
                    aria-label="Close chat panel"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-fg-muted transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    onClick={closeSidePanel}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div
                  className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
                  ref={chatScrollRef}
                >
                  {chatLoadingNodeId === activeChatNode.id ? (
                    <div className="text-[13px] text-fg-muted">
                      Loading chat history...
                    </div>
                  ) : activeChatMessages.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border bg-background px-4 py-5 text-[13px] leading-5 text-fg-muted">
                      No messages yet. Send the first prompt from this panel.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeChatMessages.map((message) => {
                        const isUser = message.role === "user";
                        return (
                          <div
                            className={`rounded-md border px-4 py-3 ${
                              isUser ? "ml-10" : "mr-10"
                            }`}
                            key={message.id}
                            style={{
                              background: isUser
                                ? "color-mix(in oklch, var(--brand) 8%, var(--paper))"
                                : "color-mix(in oklch, var(--surface) 90%, var(--paper))",
                              borderColor: isUser
                                ? "color-mix(in oklch, var(--brand) 22%, var(--rule))"
                                : "var(--rule)",
                            }}
                          >
                            <p className="mono-label mb-2">
                              {message.role === "assistant"
                                ? "Drop"
                                : message.role === "system"
                                  ? "System"
                                  : "You"}
                            </p>
                            <p className="whitespace-pre-wrap text-[14px] leading-6 text-foreground">
                              {message.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-border px-5 py-4">
                  <textarea
                    className="nodrag nopan min-h-[96px] w-full resize-none rounded-md border border-border bg-background px-3 py-3 text-[14px] leading-6 text-foreground outline-none placeholder:text-fg-subtle focus:border-brand focus:ring-[3px] focus:ring-brand/20"
                    onChange={(event) => setChatDraft(event.target.value)}
                    placeholder="Send a message to this chat..."
                    ref={chatComposerRef}
                    value={chatDraft}
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[12px] text-fg-subtle">
                      Sends persist user messages only in this phase.
                    </p>
                    <button
                      className="btn-primary flex h-10 items-center gap-2 rounded-md px-4 text-[13px]"
                      disabled={
                        sendingChatNodeId === activeChatNode.id ||
                        chatDraft.trim().length === 0
                      }
                      onClick={handleSendChatMessage}
                      type="button"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          ) : null}
        </div>

        {isEmptyCanvas ? (
          <ViewportPortal>
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ pointerEvents: "none" }}
            >
              <button
                aria-controls={ADD_PANEL_ID}
                aria-expanded={isAddPanelOpen}
                className="flex flex-col items-center gap-3 rounded-lg px-4 py-4 text-center text-foreground transition hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                onClick={openAddPanel}
                style={{ pointerEvents: "auto" }}
                type="button"
              >
                <span
                  className="flex h-24 w-24 items-center justify-center rounded-lg border-dashed"
                  style={{
                    background: emptyCardSurface,
                    borderColor: emptyCardBorder,
                    borderWidth: 3,
                  }}
                >
                  <Plus className="h-9 w-9 text-fg-subtle" strokeWidth={1.75} />
                </span>
                <span className="text-[15px] font-medium tracking-[-0.01em] text-foreground">
                  Add first step...
                </span>
              </button>
            </div>
          </ViewportPortal>
        ) : null}
      </ReactFlowProvider>
    </div>
  );
}
