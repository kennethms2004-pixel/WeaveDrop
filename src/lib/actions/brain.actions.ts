"use server";

import { revalidatePath } from "next/cache";
import mongoose, { type Types } from "mongoose";

import Brain from "@/database/models/brain.model";
import ChatMessage from "@/database/models/chat-message.model";
import Edge from "@/database/models/edge.model";
import NodeModel from "@/database/models/node.model";
import SourceIngestion from "@/database/models/source-ingestion.model";
import type { IBrain } from "@/types/db";

import type { BrainDTO } from "./dto";
import { requireUserAndDb } from "./_helpers";

function isValidBrainId(brainId: string): boolean {
  return mongoose.Types.ObjectId.isValid(brainId);
}

function toBrainDTO(doc: IBrain): BrainDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    nodeCount: doc.nodeCount ?? 0,
    edgeCount: doc.edgeCount ?? 0,
    lastOpenedAt: doc.lastOpenedAt ? doc.lastOpenedAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listBrainsForUser(): Promise<BrainDTO[]> {
  const { userId } = await requireUserAndDb();

  const docs = await Brain.find({ ownerClerkId: userId })
    .sort({ updatedAt: -1 })
    .lean<IBrain[]>();

  return docs.map(toBrainDTO);
}

export async function getBrainById(
  brainId: string,
): Promise<BrainDTO | null> {
  const { userId } = await requireUserAndDb();

  if (!isValidBrainId(brainId)) {
    return null;
  }

  const doc = await Brain.findOne({
    _id: brainId,
    ownerClerkId: userId,
  }).lean<IBrain | null>();

  if (!doc) {
    return null;
  }

  return toBrainDTO(doc);
}

export async function createBrain(nameInput: string): Promise<BrainDTO> {
  const { userId } = await requireUserAndDb();

  const name = nameInput.trim() || "Untitled brain";

  const created = await Brain.create({
    ownerClerkId: userId,
    name,
    nodeCount: 0,
    edgeCount: 0,
  });

  revalidatePath("/");

  return toBrainDTO(created.toObject() as IBrain);
}

export async function renameBrain(
  brainId: string,
  nameInput: string,
): Promise<BrainDTO> {
  const { userId } = await requireUserAndDb();

  const name = nameInput.trim();

  if (!name) {
    throw new Error("Brain name cannot be empty");
  }

  if (!isValidBrainId(brainId)) {
    throw new Error("Brain not found");
  }

  const updated = await Brain.findOneAndUpdate(
    { _id: brainId, ownerClerkId: userId },
    { $set: { name } },
    { new: true },
  ).lean<IBrain | null>();

  if (!updated) {
    throw new Error("Brain not found");
  }

  revalidatePath("/");
  revalidatePath(`/brains/${brainId}`);

  return toBrainDTO(updated);
}

export async function touchBrainLastOpened(brainId: string): Promise<void> {
  const { userId } = await requireUserAndDb();

  if (!isValidBrainId(brainId)) {
    return;
  }

  await Brain.updateOne(
    { _id: brainId, ownerClerkId: userId },
    { $set: { lastOpenedAt: new Date() } },
  );
}

export async function deleteBrain(brainId: string): Promise<void> {
  const { userId } = await requireUserAndDb();

  if (!isValidBrainId(brainId)) {
    return;
  }

  const brain = await Brain.findOne({
    _id: brainId,
    ownerClerkId: userId,
  }).lean<IBrain | null>();

  if (!brain) {
    return;
  }

  const nodeIds = await NodeModel.find({ brainId, ownerClerkId: userId })
    .select({ _id: 1 })
    .lean<{ _id: Types.ObjectId }[]>();

  const nodeIdList = nodeIds.map((doc) => doc._id);

  await Promise.all([
    ChatMessage.deleteMany({ brainId, ownerClerkId: userId }),
    Edge.deleteMany({ brainId, ownerClerkId: userId }),
    SourceIngestion.deleteMany({
      ownerClerkId: userId,
      nodeId: { $in: nodeIdList },
    }),
    NodeModel.deleteMany({ brainId, ownerClerkId: userId }),
  ]);

  await Brain.deleteOne({ _id: brainId, ownerClerkId: userId });

  revalidatePath("/");
}
