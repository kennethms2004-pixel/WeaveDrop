import { Schema, model, models, type Model } from "mongoose";

import type { INode } from "@/types/db";

const positionSchema = new Schema(
  {
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const sizeSchema = new Schema(
  {
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false },
);

const nodeSchema = new Schema<INode>(
  {
    brainId: {
      type: Schema.Types.ObjectId,
      ref: "Brain",
      required: true,
      index: true,
    },
    ownerClerkId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["source", "note", "chat"],
      required: true,
    },
    position: { type: positionSchema, required: true },
    size: { type: sizeSchema },
    data: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
    },
  },
  { timestamps: true },
);

nodeSchema.index({ brainId: 1, type: 1 });

const NodeModel: Model<INode> =
  (models.Node as Model<INode>) || model<INode>("Node", nodeSchema);

export default NodeModel;
