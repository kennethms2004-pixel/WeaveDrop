import { Schema, model, models, type Model } from "mongoose";

import type { IBrain } from "@/types/db";

const brainSchema = new Schema<IBrain>(
  {
    ownerClerkId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    nodeCount: { type: Number, default: 0 },
    edgeCount: { type: Number, default: 0 },
    lastOpenedAt: { type: Date },
  },
  { timestamps: true },
);

brainSchema.index({ ownerClerkId: 1, updatedAt: -1 });

const Brain: Model<IBrain> =
  (models.Brain as Model<IBrain>) || model<IBrain>("Brain", brainSchema);

export default Brain;
