import express from "express";
import { z } from "zod";
import { Thread, Message, Feedback, Profile } from "./models.js";
import { classify } from "./classify.js";
import { connectDb } from "./db.js";

export const api = express.Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Everything below needs MongoDB.
api.use(async (_req, res, next) => {
  try {
    await connectDb();
    next();
  } catch (err) {
    console.error("[db]", err.message);
    res.status(503).json({
      error: "Database is not connected. Check MONGODB_URI (and Atlas Network Access).",
    });
  }
});

// Anonymous per-browser id (no login).
api.use((req, res, next) => {
  const id = req.get("x-client-id");
  if (!id || !/^[\w-]{8,64}$/.test(id)) return res.status(400).json({ error: "Missing client id" });
  req.clientId = id;
  next();
});

const toThread = (t) => ({
  id: t._id,
  title: t.title,
  language: t.language,
  updated_at: t.updatedAt.toISOString(),
});

const textOf = (m) => (m.parts ?? []).map((p) => (p?.type === "text" ? p.text : "")).join("\n");

api.get("/threads", wrap(async (req, res) => {
  const threads = await Thread.find({ clientId: req.clientId }).sort({ updatedAt: -1 }).limit(200);
  res.json(threads.map(toThread));
}));

api.post("/threads", wrap(async (req, res) => {
  const t = await Thread.create({ clientId: req.clientId });
  res.json(toThread(t));
}));

api.get("/threads/:id", wrap(async (req, res) => {
  const thread = await Thread.findOne({ _id: req.params.id, clientId: req.clientId });
  if (!thread) return res.status(404).json({ error: "Not found" });
  const msgs = await Message.find({ threadId: thread._id, clientId: req.clientId }).sort({ seq: 1 });
  res.json({
    thread: toThread(thread),
    messages: msgs.map((m) => ({
      id: m.msgId,
      role: m.role,
      parts: m.parts,
      language: m.language,
      error_category: m.errorCategory,
      created_at: m.createdAt.toISOString(),
    })),
  });
}));

// Save the whole conversation, classify it and retitle the thread.
const saveSchema = z.object({ messages: z.array(z.any()).max(500) });

api.put("/threads/:id/messages", wrap(async (req, res) => {
  const parsed = saveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Bad request" });
  const thread = await Thread.findOne({ _id: req.params.id, clientId: req.clientId });
  if (!thread) return res.status(404).json({ error: "Not found" });

  let lastUser = { language: null, category: null };
  let lastUserText = "";
  const docs = [];
  parsed.data.messages.forEach((m, seq) => {
    if (!m || typeof m.id !== "string" || (m.role !== "user" && m.role !== "assistant")) return;
    const text = textOf(m);
    if (m.role === "user") {
      const c = classify(text);
      lastUser = { language: c.language, category: c.category };
      lastUserText = text;
      docs.push({ msgId: m.id, seq, role: m.role, parts: m.parts ?? [], language: c.language, errorCategory: c.category });
    } else {
      docs.push({
        msgId: m.id, seq, role: m.role, parts: m.parts ?? [],
        language: lastUser.language,
        errorCategory: classify(text).category ?? lastUser.category,
      });
    }
  });

  if (docs.length) {
    await Message.bulkWrite(
      docs.map((d) => ({
        updateOne: {
          filter: { threadId: thread._id, clientId: req.clientId, msgId: d.msgId },
          update: {
            $set: { seq: d.seq, role: d.role, parts: d.parts, language: d.language, errorCategory: d.errorCategory },
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      })),
    );
  }
  await Message.deleteMany({
    threadId: thread._id,
    clientId: req.clientId,
    msgId: { $nin: docs.map((d) => d.msgId) },
  });

  const set = {};
  if (lastUserText) set.title = lastUserText.split("\n").find((l) => l.trim())?.slice(0, 60) ?? "New conversation";
  if (lastUser.language) set.language = lastUser.language;
  await Thread.updateOne({ _id: thread._id, clientId: req.clientId }, { $set: set });
  res.json({ ok: true });
}));

api.delete("/threads/:id", wrap(async (req, res) => {
  const ids = await Message.distinct("msgId", { threadId: req.params.id, clientId: req.clientId });
  await Feedback.deleteMany({ clientId: req.clientId, messageId: { $in: ids } });
  await Message.deleteMany({ threadId: req.params.id, clientId: req.clientId });
  await Thread.deleteOne({ _id: req.params.id, clientId: req.clientId });
  res.json({ ok: true });
}));

const feedbackSchema = z.object({
  message_id: z.string().min(1).max(200),
  rating: z.union([z.literal(1), z.literal(-1)]),
});

api.post("/feedback", wrap(async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Bad request" });
  await Feedback.updateOne(
    { clientId: req.clientId, messageId: parsed.data.message_id },
    { $set: { rating: parsed.data.rating } },
    { upsert: true },
  );
  res.json({ ok: true });
}));

const toProfile = (p) => ({
  display_name: p?.displayName ?? "",
  allow_training: p?.allowTraining ?? false,
  anonymize_snippets: p?.anonymizeSnippets ?? true,
});

api.get("/profile", wrap(async (req, res) => {
  res.json(toProfile(await Profile.findOne({ clientId: req.clientId })));
}));

const profileSchema = z.object({
  display_name: z.string().max(80).optional(),
  allow_training: z.boolean().optional(),
  anonymize_snippets: z.boolean().optional(),
});

api.put("/profile", wrap(async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Bad request" });
  const d = parsed.data;
  const set = {};
  if (d.display_name !== undefined) set.displayName = d.display_name;
  if (d.allow_training !== undefined) set.allowTraining = d.allow_training;
  if (d.anonymize_snippets !== undefined) set.anonymizeSnippets = d.anonymize_snippets;
  const p = await Profile.findOneAndUpdate(
    { clientId: req.clientId },
    { $set: set },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.json(toProfile(p));
}));

api.delete("/data", wrap(async (req, res) => {
  await Feedback.deleteMany({ clientId: req.clientId });
  await Message.deleteMany({ clientId: req.clientId });
  await Thread.deleteMany({ clientId: req.clientId });
  res.json({ ok: true });
}));

api.get("/stats", wrap(async (req, res) => {
  const clientId = req.clientId;
  const top = (field, limit) =>
    Message.aggregate([
      { $match: { clientId, [field]: { $ne: null } } },
      { $group: { _id: `$${field}`, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: limit },
    ]).then((rows) => rows.map((r) => [r._id, r.n]));

  const [threads, messages, positive, negative, topErrors, topLanguages] = await Promise.all([
    Thread.countDocuments({ clientId }),
    Message.countDocuments({ clientId }),
    Feedback.countDocuments({ clientId, rating: 1 }),
    Feedback.countDocuments({ clientId, rating: -1 }),
    top("errorCategory", 8),
    top("language", 6),
  ]);
  res.json({ threads, messages, positive, negative, topErrors, topLanguages });
}));
