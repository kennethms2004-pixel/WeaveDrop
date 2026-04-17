import { Schema, model, models, type Model } from "mongoose";

import type { ISourceIngestion } from "@/types/db";

const contentChunkSchema = new Schema(
  {
    index: { type: Number, required: true },
    text: { type: String, required: true },
    tokens: { type: Number },
  },
  { _id: false },
);

const sourceIngestionSchema = new Schema<ISourceIngestion>(
  {
    nodeId: {
      type: Schema.Types.ObjectId,
      ref: "Node",
      required: true,
      unique: true,
      index: true,
    },
    ownerClerkId: { type: String, required: true, index: true },
    sourceUrl: { type: String, required: true },
    sourceType: {
      type: String,
      enum: ["webpage", "youtube", "pdf"],
      required: true,
    },
    title: { type: String },
    summary: { type: String },
    contentChunks: { type: [contentChunkSchema], default: [] },
    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      required: true,
      default: "processing",
    },
    errorMessage: { type: String },
  },
  { timestamps: true },
);

sourceIngestionSchema.index({ "contentChunks.text": "text" });

const SourceIngestion: Model<ISourceIngestion> =
  (models.SourceIngestion as Model<ISourceIngestion>) ||
  model<ISourceIngestion>("SourceIngestion", sourceIngestionSchema);

export default SourceIngestion;
