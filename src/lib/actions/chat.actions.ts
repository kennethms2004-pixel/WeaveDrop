"use server";

import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

import ChatMessage from "@/database/models/chat-message.model";
import NodeModel from "@/database/models/node.model";
import type { ChatRole, IChatMessage, INode } from "@/types/db";

import type { ChatMessageDTO } from "./dto";
import { requireUserAndDb } from "./_helpers";

function parseMessageCursor(
  cursor: string,
): { cursorDate: Date; cursorId: mongoose.Types.ObjectId } | null {
  const pipe = cursor.indexOf("|");
  if (pipe === -1) {
    return null;
  }
  const iso = cursor.slice(0, pipe);
  const id = cursor.slice(pipe + 1);
  const cursorDate = new Date(iso);
  if (Number.isNaN(cursorDate.getTime())) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  return { cursorDate, cursorId: new mongoose.Types.ObjectId(id) };
}

function formatMessageCursor(doc: IChatMessage): string {
  return `${doc.createdAt.toISOString()}|${String(doc._id)}`;
}

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
  /** Composite cursor: `{createdAt ISO}|{_id}` from the last loaded message. */
  cursor?: string;
  limit?: number;
};

export async function listMessagesForChatNode(
  input: ListMessagesInput,
): Promise<{ messages: ChatMessageDTO[]; nextCursor: string | null }> {
  const { userId } = await requireUserAndDb();

  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);

  const baseMatch = {
    chatNodeId: input.chatNodeId,
    ownerClerkId: userId,
  };

  let filter: Record<string, unknown> = baseMatch;

  if (input.cursor) {
    const parsed = parseMessageCursor(input.cursor);
    if (parsed) {
      const { cursorDate, cursorId } = parsed;
      filter = {
        $and: [
          baseMatch,
          {
            $or: [
              { createdAt: { $gt: cursorDate } },
              { createdAt: cursorDate, _id: { $gt: cursorId } },
            ],
          },
        ],
      };
    } else if (!input.cursor.includes("|")) {
      const legacyDate = new Date(input.cursor);
      if (!Number.isNaN(legacyDate.getTime())) {
        filter = { ...baseMatch, createdAt: { $gt: legacyDate } };
      }
    }
  }

  const docs = await ChatMessage.find(filter)
    .sort({ createdAt: 1, _id: 1 })
    .limit(limit + 1)
    .lean<IChatMessage[]>();

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const nextCursor = hasMore
    ? formatMessageCursor(page[page.length - 1])
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
