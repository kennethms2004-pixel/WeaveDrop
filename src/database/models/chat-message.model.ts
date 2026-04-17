import { Schema, model, models, type Model } from "mongoose";

import type { IChatMessage } from "@/types/db";

const chatMessageSchema = new Schema<IChatMessage>(
  {
    chatNodeId: {
      type: Schema.Types.ObjectId,
      ref: "Node",
      required: true,
      index: true,
    },
    brainId: {
      type: Schema.Types.ObjectId,
      ref: "Brain",
      required: true,
      index: true,
    },
    ownerClerkId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
    contextNodeIds: [{ type: Schema.Types.ObjectId, ref: "Node" }],
  },
  { timestamps: true },
);

chatMessageSchema.index({ chatNodeId: 1, createdAt: 1 });

const ChatMessage: Model<IChatMessage> =
  (models.ChatMessage as Model<IChatMessage>) ||
  model<IChatMessage>("ChatMessage", chatMessageSchema);

export default ChatMessage;
