import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

const { Schema, model } = mongoose;

// There is no login. Each browser gets a random clientId (kept in its localStorage)
// so different visitors don't see each other's chats. It is NOT a security feature.

const threadSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    clientId: { type: String, required: true, index: true },
    title: { type: String, default: "New conversation" },
    language: { type: String, default: null },
  },
  { timestamps: true },
);

const messageSchema = new Schema({
  threadId: { type: String, required: true, index: true },
  clientId: { type: String, required: true, index: true },
  msgId: { type: String, required: true },
  seq: { type: Number, default: 0 },
  role: { type: String, required: true },
  parts: { type: Schema.Types.Mixed, default: [] },
  language: { type: String, default: null },
  errorCategory: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});
messageSchema.index({ threadId: 1, msgId: 1 }, { unique: true });

const feedbackSchema = new Schema(
  {
    clientId: { type: String, required: true },
    messageId: { type: String, required: true },
    rating: { type: Number, enum: [1, -1], required: true },
    comment: { type: String, default: null },
  },
  { timestamps: true },
);
feedbackSchema.index({ clientId: 1, messageId: 1 }, { unique: true });

const profileSchema = new Schema({
  clientId: { type: String, required: true, unique: true },
  displayName: { type: String, default: "" },
  allowTraining: { type: Boolean, default: false },
  anonymizeSnippets: { type: Boolean, default: true },
});

export const Thread = model("Thread", threadSchema);
export const Message = model("Message", messageSchema);
export const Feedback = model("Feedback", feedbackSchema);
export const Profile = model("Profile", profileSchema);
