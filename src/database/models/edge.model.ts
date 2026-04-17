import { Schema, model, models, type Model } from "mongoose";

import type { IEdge } from "@/types/db";

const edgeSchema = new Schema<IEdge>(
  {
    brainId: {
      type: Schema.Types.ObjectId,
      ref: "Brain",
      required: true,
      index: true,
    },
    ownerClerkId: { type: String, required: true, index: true },
    sourceNodeId: {
      type: Schema.Types.ObjectId,
      ref: "Node",
      required: true,
    },
    targetNodeId: {
      type: Schema.Types.ObjectId,
      ref: "Node",
      required: true,
    },
    sourceHandle: { type: String, default: "" },
    targetHandle: { type: String, default: "" },
  },
  { timestamps: true },
);

edgeSchema.index({ brainId: 1, targetNodeId: 1 });
edgeSchema.index(
  {
    brainId: 1,
    sourceNodeId: 1,
    sourceHandle: 1,
    targetNodeId: 1,
    targetHandle: 1,
  },
  { unique: true },
);

const Edge: Model<IEdge> =
  (models.Edge as Model<IEdge>) || model<IEdge>("Edge", edgeSchema);

export default Edge;
