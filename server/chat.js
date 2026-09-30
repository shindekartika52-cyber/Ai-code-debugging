import express from "express";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText } from "ai";
import { SYSTEM_PROMPT, SIMPLIFY_PROMPT } from "./prompts.js";

export const chatRouter = express.Router();

const bodySchema = z.object({
  messages: z.array(z.any()).min(1).max(100),
  threadId: z.string().optional(),
  mode: z.enum(["debug", "simplify"]).optional(),
});

// Public endpoint: light per-IP rate limit so the Gemini key can't be drained by one client.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > WINDOW_MS) hits.delete(k);
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}

chatRouter.post("/", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).send("Bad request");
  const payload = parsed.data;

  // The Gemini key stays on the server and is never sent to the browser.
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return res.status(500).send("Missing GOOGLE_GENERATIVE_AI_API_KEY");

  if (isRateLimited(req.ip || "local")) return res.status(429).send("Too many requests");

  try {
    const google = createGoogleGenerativeAI({ apiKey: key });
    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: payload.mode === "simplify" ? SIMPLIFY_PROMPT : SYSTEM_PROMPT,
      messages: await convertToModelMessages(payload.messages),
    });
    result.pipeUIMessageStreamToResponse(res, { originalMessages: payload.messages });
  } catch (err) {
    console.error("[chat]", err);
    if (!res.headersSent) res.status(500).send("Chat failed");
  }
});
