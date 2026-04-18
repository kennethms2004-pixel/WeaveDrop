import type { Node, NodeProps } from "@xyflow/react";

import type { ChatRole, SourceStatus } from "@/types/db";

export type LatestMessagePreview = {
  role: ChatRole;
  content: string;
} | null;

export type ChatContextTone = "muted" | "neutral" | "ok" | "warn" | "fail";

export type ChatContextSummary = {
  label: string;
  tone: ChatContextTone;
};

export type NoteNodeData = {
  kind: "note";
  label: string;
  title: string;
  text: string;
  status: SourceStatus | null;
  isSaving: boolean;
  onChange: (patch: { title?: string; text?: string }) => void;
};

export type ChatNodeData = {
  kind: "chat";
  label: string;
  title: string;
  status: SourceStatus | null;
  latestMessagePreview: LatestMessagePreview;
  contextSummary: ChatContextSummary;
  onOpen: () => void;
};

export type NoteFlowNode = Node<NoteNodeData, "note">;
export type ChatFlowNode = Node<ChatNodeData, "chat">;

export type NoteFlowNodeProps = NodeProps<NoteFlowNode>;
export type ChatFlowNodeProps = NodeProps<ChatFlowNode>;
