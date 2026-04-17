"use server";

import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

import Brain from "@/database/models/brain.model";
import Edge from "@/database/models/edge.model";
import NodeModel from "@/database/models/node.model";
import type { IEdge, INode, NodeType } from "@/types/db";

import type { EdgeDTO } from "./dto";
import { requireUserAndDb } from "./_helpers";

function handleToDto(value: string | undefined): string | null {
  return value != null && value !== "" ? value : null;
}

function toEdgeDTO(doc: IEdge): EdgeDTO {
  return {
    id: String(doc._id),
    brainId: String(doc.brainId),
    sourceNodeId: String(doc.sourceNodeId),
    targetNodeId: String(doc.targetNodeId),
    sourceHandle: handleToDto(doc.sourceHandle),
    targetHandle: handleToDto(doc.targetHandle),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function isValidEdgePair(sourceType: NodeType, targetType: NodeType): boolean {
  // PRD 4.4: chat nodes are sinks for context; they cannot act as sources
  // pointing back to web/source nodes.
  if (sourceType === "chat" && targetType === "source") {
    return false;
  }
  // A chat cannot feed into another chat (no chat→chat composition in V1).
  if (sourceType === "chat" && targetType === "chat") {
    return false;
  }
  return true;
}

export async function listEdgesForBrain(
  brainId: string,
): Promise<EdgeDTO[]> {
  const { userId } = await requireUserAndDb();

  const docs = await Edge.find({ brainId, ownerClerkId: userId })
    .sort({ createdAt: 1 })
    .lean<IEdge[]>();

  return docs.map(toEdgeDTO);
}

export type CreateEdgeInput = {
  brainId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export async function createEdge(input: CreateEdgeInput): Promise<EdgeDTO> {
  const { userId } = await requireUserAndDb();

  if (input.sourceNodeId === input.targetNodeId) {
    throw new Error("A node cannot connect to itself");
  }

  const [sourceNode, targetNode] = await Promise.all([
    NodeModel.findOne({
      _id: input.sourceNodeId,
      brainId: input.brainId,
      ownerClerkId: userId,
    })
      .select({ type: 1 })
      .lean<Pick<INode, "type"> | null>(),
    NodeModel.findOne({
      _id: input.targetNodeId,
      brainId: input.brainId,
      ownerClerkId: userId,
    })
      .select({ type: 1 })
      .lean<Pick<INode, "type"> | null>(),
  ]);

  if (!sourceNode || !targetNode) {
    throw new Error("Source or target node not found in this brain");
  }

  if (!isValidEdgePair(sourceNode.type, targetNode.type)) {
    throw new Error(
      `Invalid connection: ${sourceNode.type} → ${targetNode.type}`,
    );
  }

  const session = await mongoose.startSession();
  let createdPlain: IEdge | null = null;

  try {
    await session.withTransaction(async () => {
      const createdDocs = await Edge.create(
        [
          {
            brainId: input.brainId,
            ownerClerkId: userId,
            sourceNodeId: input.sourceNodeId,
            targetNodeId: input.targetNodeId,
            sourceHandle: input.sourceHandle ?? "",
            targetHandle: input.targetHandle ?? "",
          },
        ],
        { session },
      );

      const created = createdDocs[0];
      if (!created) {
        throw new Error("Failed to create edge");
      }

      await Brain.updateOne(
        { _id: input.brainId, ownerClerkId: userId },
        { $inc: { edgeCount: 1 } },
        { session },
      );

      createdPlain = created.toObject() as IEdge;
    });

    if (!createdPlain) {
      throw new Error("Failed to create edge");
    }

    revalidatePath(`/brains/${input.brainId}`);

    return toEdgeDTO(createdPlain);
  } finally {
    await session.endSession();
  }
}

export async function deleteEdge(edgeId: string): Promise<void> {
  const { userId } = await requireUserAndDb();

  const session = await mongoose.startSession();
  let brainIdForRevalidate: string | null = null;

  try {
    await session.withTransaction(async () => {
      const edge = await Edge.findOneAndDelete(
        { _id: edgeId, ownerClerkId: userId },
        { session },
      );

      if (!edge) {
        return;
      }

      brainIdForRevalidate = String(edge.brainId);

      await Brain.updateOne(
        { _id: edge.brainId, ownerClerkId: userId },
        { $inc: { edgeCount: -1 } },
        { session },
      );
    });

    if (brainIdForRevalidate) {
      revalidatePath(`/brains/${brainIdForRevalidate}`);
    }
  } finally {
    await session.endSession();
  }
}
