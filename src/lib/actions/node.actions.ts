"use server";

import { revalidatePath } from "next/cache";

import Brain from "@/database/models/brain.model";
import ChatMessage from "@/database/models/chat-message.model";
import Edge from "@/database/models/edge.model";
import NodeModel from "@/database/models/node.model";
import SourceIngestion from "@/database/models/source-ingestion.model";
import type { INode, NodeType, SourceStatus } from "@/types/db";

import type { NodeDTO } from "./dto";
import { requireUserAndDb } from "./_helpers";

function toNodeDTO(
  doc: INode,
  options?: {
    latestChatMessage?: { role: "user" | "assistant" | "system"; content: string } | null;
  },
): NodeDTO {
  const latestChatMessage = options?.latestChatMessage ?? null;

  return {
    id: String(doc._id),
    brainId: String(doc.brainId),
    type: doc.type,
    position: { x: doc.position?.x ?? 0, y: doc.position?.y ?? 0 },
    size: doc.size ? { width: doc.size.width, height: doc.size.height } : null,
    data: {
      ...(doc.data ?? {}),
      ...(latestChatMessage ? { latestMessagePreview: latestChatMessage } : {}),
    },
    status: (doc.status as SourceStatus | undefined) ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listNodesForBrain(
  brainId: string,
): Promise<NodeDTO[]> {
  const { userId } = await requireUserAndDb();

  const docs = await NodeModel.find({ brainId, ownerClerkId: userId })
    .sort({ createdAt: 1 })
    .lean<INode[]>();

  const chatNodeIds = docs
    .filter((doc) => doc.type === "chat")
    .map((doc) => doc._id);

  const latestMessages =
    chatNodeIds.length > 0
      ? await ChatMessage.aggregate<{
          _id: import("mongoose").Types.ObjectId;
          role: "user" | "assistant" | "system";
          content: string;
        }>([
          {
            $match: {
              ownerClerkId: userId,
              chatNodeId: { $in: chatNodeIds },
            },
          },
          { $sort: { createdAt: -1, _id: -1 } },
          {
            $group: {
              _id: "$chatNodeId",
              role: { $first: "$role" },
              content: { $first: "$content" },
            },
          },
        ])
      : [];

  const latestMessageByChatId = new Map(
    latestMessages.map((message) => [
      String(message._id),
      { role: message.role, content: message.content },
    ]),
  );

  return docs.map((doc) =>
    toNodeDTO(doc, {
      latestChatMessage:
        doc.type === "chat"
          ? latestMessageByChatId.get(String(doc._id)) ?? null
          : null,
    }),
  );
}

export type CreateNodeInput = {
  brainId: string;
  type: NodeType;
  position: { x: number; y: number };
  size?: { width?: number; height?: number };
  data?: Record<string, unknown>;
  status?: SourceStatus;
};

export async function createNode(input: CreateNodeInput): Promise<NodeDTO> {
  const { userId } = await requireUserAndDb();

  const brain = await Brain.findOne({
    _id: input.brainId,
    ownerClerkId: userId,
  }).select({ _id: 1 });

  if (!brain) {
    throw new Error("Brain not found");
  }

  const created = await NodeModel.create({
    brainId: input.brainId,
    ownerClerkId: userId,
    type: input.type,
    position: input.position,
    size: input.size,
    data: input.data ?? {},
    status: input.type === "source" ? input.status ?? "processing" : undefined,
  });

  await Brain.updateOne(
    { _id: input.brainId, ownerClerkId: userId },
    { $inc: { nodeCount: 1 } },
  );

  revalidatePath(`/brains/${input.brainId}`);

  return toNodeDTO(created.toObject() as INode);
}

export type UpdateNodeInput = {
  nodeId: string;
  position?: { x: number; y: number };
  size?: { width?: number; height?: number };
  data?: Record<string, unknown>;
  status?: SourceStatus;
};

export async function updateNode(input: UpdateNodeInput): Promise<NodeDTO> {
  const { userId } = await requireUserAndDb();

  const update: Record<string, unknown> = {};

  if (input.position) {
    update.position = input.position;
  }
  if (input.size) {
    update.size = input.size;
  }
  if (input.data !== undefined) {
    update.data = input.data;
  }
  if (input.status !== undefined) {
    update.status = input.status;
  }

  const updated = await NodeModel.findOneAndUpdate(
    { _id: input.nodeId, ownerClerkId: userId },
    { $set: update },
    { new: true },
  ).lean<INode | null>();

  if (!updated) {
    throw new Error("Node not found");
  }

  revalidatePath(`/brains/${String(updated.brainId)}`);

  return toNodeDTO(updated);
}

export async function deleteNode(nodeId: string): Promise<void> {
  const { userId } = await requireUserAndDb();

  const node = await NodeModel.findOne({
    _id: nodeId,
    ownerClerkId: userId,
  }).lean<INode | null>();

  if (!node) {
    return;
  }

  const [edgeResult] = await Promise.all([
    Edge.deleteMany({
      ownerClerkId: userId,
      $or: [{ sourceNodeId: nodeId }, { targetNodeId: nodeId }],
    }),
    ChatMessage.deleteMany({ chatNodeId: nodeId, ownerClerkId: userId }),
    SourceIngestion.deleteMany({ nodeId, ownerClerkId: userId }),
  ]);

  const deleteResult = await NodeModel.deleteOne({
    _id: nodeId,
    ownerClerkId: userId,
  });

  if (deleteResult.deletedCount > 0) {
    await Brain.updateOne(
      { _id: node.brainId, ownerClerkId: userId },
      {
        $inc: {
          nodeCount: -1,
          edgeCount: -(edgeResult?.deletedCount ?? 0),
        },
      },
    );
  }

  revalidatePath(`/brains/${String(node.brainId)}`);
}
