import type { Types } from "mongoose";

export type NodeType = "source" | "note" | "chat";

export type SourceType = "webpage" | "youtube" | "pdf";

export type SourceStatus = "processing" | "ready" | "failed";

export type ChatRole = "user" | "assistant" | "system";

export interface IBrain {
  _id: Types.ObjectId;
  ownerClerkId: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  lastOpenedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INodePosition {
  x: number;
  y: number;
}

export interface INodeSize {
  width?: number;
  height?: number;
}

export interface INode {
  _id: Types.ObjectId;
  brainId: Types.ObjectId;
  ownerClerkId: string;
  type: NodeType;
  position: INodePosition;
  size?: INodeSize;
  /**
   * Type-specific payload. Shape depends on `type`:
   * - source: { title?, url, sourceType, summary?, thumbnailUrl? }
   * - note:   { text }
   * - chat:   { title?, model? }
   */
  data: Record<string, unknown>;
  /** Only relevant for `type === "source"`. */
  status?: SourceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEdge {
  _id: Types.ObjectId;
  brainId: Types.ObjectId;
  ownerClerkId: string;
  sourceNodeId: Types.ObjectId;
  targetNodeId: Types.ObjectId;
  sourceHandle?: string;
  targetHandle?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatMessage {
  _id: Types.ObjectId;
  chatNodeId: Types.ObjectId;
  brainId: Types.ObjectId;
  ownerClerkId: string;
  role: ChatRole;
  content: string;
  /** Snapshot of context node ids wired into the chat at send time. */
  contextNodeIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ISourceContentChunk {
  index: number;
  text: string;
  tokens?: number;
}

export interface ISourceIngestion {
  _id: Types.ObjectId;
  nodeId: Types.ObjectId;
  ownerClerkId: string;
  sourceUrl: string;
  sourceType: SourceType;
  title?: string;
  summary?: string;
  contentChunks: ISourceContentChunk[];
  status: SourceStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
