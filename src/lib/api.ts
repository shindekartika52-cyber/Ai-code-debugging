// Talks to the Express + MongoDB backend (server/). Every function returns a Promise.
import type { UIMessage } from "ai";

export type Thread = { id: string; title: string; language: string | null; updated_at: string };
export type Profile = { display_name: string; allow_training: boolean; anonymize_snippets: boolean };

const CLIENT_ID_KEY = "debugsh:clientId";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// No login: each browser gets a random id so visitors don't see each other's chats.
function clientId() {
  try {
    let id = window.localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = uuid();
      window.localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return "anonymous-session";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-client-id": clientId(), ...init.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text;
    try { message = JSON.parse(text).error ?? text; } catch { /* plain text */ }
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const listThreads = () => request<Thread[]>("/threads");
export const createThread = () => request<Thread>("/threads", { method: "POST", body: "{}" });
export const deleteThread = (id: string) => request<{ ok: true }>(`/threads/${id}`, { method: "DELETE" });

export const getThread = (id: string) =>
  request<{
    thread: Thread;
    messages: { id: string; role: UIMessage["role"]; parts: UIMessage["parts"]; language: string | null; error_category: string | null; created_at: string }[];
  }>(`/threads/${id}`);

export const saveConversation = (threadId: string, messages: UIMessage[]) =>
  request<{ ok: true }>(`/threads/${threadId}/messages`, { method: "PUT", body: JSON.stringify({ messages }) });

export const submitFeedback = (messageId: string, rating: 1 | -1) =>
  request<{ ok: true }>("/feedback", { method: "POST", body: JSON.stringify({ message_id: messageId, rating }) });

export const getProfile = () => request<Profile>("/profile");
export const updateProfile = (patch: Partial<Profile>) =>
  request<Profile>("/profile", { method: "PUT", body: JSON.stringify(patch) });

export const deleteAllData = () => request<{ ok: true }>("/data", { method: "DELETE" });

export const getStats = () =>
  request<{
    threads: number;
    messages: number;
    positive: number;
    negative: number;
    topErrors: [string, number][];
    topLanguages: [string, number][];
  }>("/stats");
