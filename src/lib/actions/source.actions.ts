"use server";

import { revalidatePath } from "next/cache";

import NodeModel from "@/database/models/node.model";
import SourceIngestion from "@/database/models/source-ingestion.model";
import type {
  INode,
  ISourceContentChunk,
  ISourceIngestion,
  SourceStatus,
  SourceType,
} from "@/types/db";

import type { SourceIngestionDTO } from "./dto";
import { requireUserAndDb } from "./_helpers";

function toSourceIngestionDTO(doc: ISourceIngestion): SourceIngestionDTO {
  return {
    id: String(doc._id),
    nodeId: String(doc.nodeId),
    sourceUrl: doc.sourceUrl,
    sourceType: doc.sourceType,
    title: doc.title ?? null,
    summary: doc.summary ?? null,
    status: doc.status,
    errorMessage: doc.errorMessage ?? null,
    chunkCount: doc.contentChunks?.length ?? 0,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export type UpsertSourceIngestionInput = {
  nodeId: string;
  sourceUrl: string;
  sourceType: SourceType;
  title?: string;
  summary?: string;
  contentChunks?: ISourceContentChunk[];
  status?: SourceStatus;
  errorMessage?: string;
};

export async function upsertSourceIngestion(
  input: UpsertSourceIngestionInput,
): Promise<SourceIngestionDTO> {
  const { userId } = await requireUserAndDb();

  const sourceNode = await NodeModel.findOne({
    _id: input.nodeId,
    ownerClerkId: userId,
    type: "source",
  })
    .select({ brainId: 1 })
    .lean<Pick<INode, "brainId"> | null>();

  if (!sourceNode) {
    throw new Error("Source node not found");
  }

  const update: Record<string, unknown> = {
    ownerClerkId: userId,
    sourceUrl: input.sourceUrl,
    sourceType: input.sourceType,
  };

  if (input.title !== undefined) update.title = input.title;
  if (input.summary !== undefined) update.summary = input.summary;
  if (input.contentChunks !== undefined) update.contentChunks = input.contentChunks;
  if (input.status !== undefined) update.status = input.status;
  if (input.errorMessage !== undefined) update.errorMessage = input.errorMessage;

  const saved = await SourceIngestion.findOneAndUpdate(
    { nodeId: input.nodeId },
    { $set: update, $setOnInsert: { nodeId: input.nodeId } },
    { upsert: true, new: true },
  ).lean<ISourceIngestion>();

  if (input.status) {
    await NodeModel.updateOne(
      { _id: input.nodeId, ownerClerkId: userId },
      { $set: { status: input.status } },
    );
  }

  revalidatePath(`/brains/${String(sourceNode.brainId)}`);

  return toSourceIngestionDTO(saved);
}

export async function setSourceStatus(
  nodeId: string,
  status: SourceStatus,
  errorMessage?: string,
): Promise<void> {
  const { userId } = await requireUserAndDb();

  const sourceNode = await NodeModel.findOne({
    _id: nodeId,
    ownerClerkId: userId,
    type: "source",
  })
    .select({ brainId: 1 })
    .lean<Pick<INode, "brainId"> | null>();

  if (!sourceNode) {
    throw new Error("Source node not found");
  }

  await Promise.all([
    NodeModel.updateOne(
      { _id: nodeId, ownerClerkId: userId },
      { $set: { status } },
    ),
    SourceIngestion.updateOne(
      { nodeId },
      {
        $set: {
          status,
          ...(errorMessage !== undefined ? { errorMessage } : {}),
        },
      },
    ),
  ]);

  revalidatePath(`/brains/${String(sourceNode.brainId)}`);
}

export async function getSourceIngestion(
  nodeId: string,
): Promise<SourceIngestionDTO | null> {
  const { userId } = await requireUserAndDb();

  const doc = await SourceIngestion.findOne({
    nodeId,
    ownerClerkId: userId,
  }).lean<ISourceIngestion | null>();

  if (!doc) {
    return null;
  }

  return toSourceIngestionDTO(doc);
}
