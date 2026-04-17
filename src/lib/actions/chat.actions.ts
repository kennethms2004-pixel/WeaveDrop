"use server";

import { revalidatePath } from "next/cache";

import ChatMessage from "@/database/models/chat-message.model";
import NodeModel from "@/database/models/node.model";
import type { ChatRole, IChatMessage, INode } from "@/types/db";

import type { ChatMessageDTO } from "./dto";
import { requireUserAndDb } from "./_helpers";

function toChatMessageDTO(doc: IChatMessage): ChatMessageDTO {
  return {
    id: String(doc._id),
    chatNodeId: String(doc.chatNodeId),
    brainId: String(doc.brainId),
    role: doc.role,
    content: doc.content,
    contextNodeIds: (doc.contextNodeIds ?? []).map((id) => String(id)),
    createdAt: doc.createdAt.toISOString(),
  };
}

export type AppendChatMessageInput = {
  chatNodeId: string;
  role: ChatRole;
  content: string;
  contextNodeIds?: string[];
};

export async function appendChatMessage(
  input: AppendChatMessageInput,
): Promise<ChatMessageDTO> {
  const { userId } = await requireUserAndDb();

  const chatNode = await NodeModel.findOne({
    _id: input.chatNodeId,
    ownerClerkId: userId,
    type: "chat",
  })
    .select({ brainId: 1, type: 1 })
    .lean<Pick<INode, "brainId" | "type"> | null>();

  if (!chatNode) {
    throw new Error("Chat node not found");
  }

  const created = await ChatMessage.create({
    chatNodeId: input.chatNodeId,
    brainId: chatNode.brainId,
    ownerClerkId: userId,
    role: input.role,
    content: input.content,
    contextNodeIds: input.contextNodeIds ?? [],
  });

  revalidatePath(`/brains/${String(chatNode.brainId)}`);

  return toChatMessageDTO(created.toObject() as IChatMessage);
}

export type ListMessagesInput = {
  chatNodeId: string;
  /** Cursor is the ISO `createdAt` of the last message already loaded. */
  cursor?: string;
  limit?: number;
};

export async function listMessagesForChatNode(
  input: ListMessagesInput,
): Promise<{ messages: ChatMessageDTO[]; nextCursor: string | null }> {
  const { userId } = await requireUserAndDb();

  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);

  const filter: Record<string, unknown> = {
    chatNodeId: input.chatNodeId,
    ownerClerkId: userId,
  };

  if (input.cursor) {
    filter.createdAt = { $gt: new Date(input.cursor) };
  }

  const docs = await ChatMessage.find(filter)
    .sort({ createdAt: 1 })
    .limit(limit + 1)
    .lean<IChatMessage[]>();

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const nextCursor = hasMore
    ? page[page.length - 1].createdAt.toISOString()
    : null;

  return {
    messages: page.map(toChatMessageDTO),
    nextCursor,
  };
}

export async function deleteChatHistory(chatNodeId: string): Promise<void> {
  const { userId } = await requireUserAndDb();

  const chatNode = await NodeModel.findOne({
    _id: chatNodeId,
    ownerClerkId: userId,
    type: "chat",
  })
    .select({ brainId: 1 })
    .lean<Pick<INode, "brainId"> | null>();

  if (!chatNode) {
    return;
  }

  await ChatMessage.deleteMany({
    chatNodeId,
    ownerClerkId: userId,
  });

  revalidatePath(`/brains/${String(chatNode.brainId)}`);
}
