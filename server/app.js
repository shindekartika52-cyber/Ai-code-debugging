import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chatRouter } from "./chat.js";
import { api } from "./routes.js";

// The Express app. Used by server/index.js (local) and api/index.js (Vercel).
const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: mongoose.connection.readyState === 1 ? "connected" : "not connected yet" });
});
app.use("/api/chat", chatRouter); // Gemini streaming (does not need the database)
app.use("/api", api); // threads, messages, feedback, profile, stats (MongoDB)

// After `npm run build`, `npm start` serves the built React app from this same server.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
if (fs.existsSync(path.join(dist, "index.html"))) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[server]", err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

export default app;
