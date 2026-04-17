import type {
  ChatRole,
  NodeType,
  SourceStatus,
  SourceType,
} from "@/types/db";

export type BrainDTO = {
  id: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NodeDTO = {
  id: string;
  brainId: string;
  type: NodeType;
  position: { x: number; y: number };
  size: { width?: number; height?: number } | null;
  data: Record<string, unknown>;
  status: SourceStatus | null;
  createdAt: string;
  updatedAt: string;
};

export type EdgeDTO = {
  id: string;
  brainId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessageDTO = {
  id: string;
  chatNodeId: string;
  brainId: string;
  role: ChatRole;
  content: string;
  contextNodeIds: string[];
  createdAt: string;
};

export type SourceIngestionDTO = {
  id: string;
  nodeId: string;
  sourceUrl: string;
  sourceType: SourceType;
  title: string | null;
  summary: string | null;
  status: SourceStatus;
  errorMessage: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
};
