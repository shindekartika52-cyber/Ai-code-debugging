import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ThumbsUp, ThumbsDown, Send, Loader2, Bug, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { getThread, saveConversation, submitFeedback } from "@/lib/api";
import logo from "@/assets/logo.png";

const searchSchema = z.object({ seed: z.string().optional() });

export const Route = createFileRoute("/chat/$threadId")({
  validateSearch: (s) => searchSchema.parse(s),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { seed } = Route.useSearch();
  const qc = useQueryClient();

  // Load saved history from the API before mounting the chat (useChat only reads its initial messages once).
  const { data, isLoading, error } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => getThread(threadId),
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

  const initialMessages = useMemo<UIMessage[]>(
    () => (data?.messages ?? []).map((m: any) => ({
      id: m.id, role: m.role, parts: m.parts,
    })),
    [data?.messages]
  );

  if (isLoading || !data) {
    return (
      <div className="mono px-6 py-6 text-xs text-muted-foreground">
        {error ? `// ${error instanceof Error ? error.message : "could not load conversation"}` : "loading history…"}
      </div>
    );
  }

  return (
    <ChatWindow
      key={threadId}
      threadId={threadId}
      initialMessages={initialMessages}
      loading={false}
      seed={seed}
      onFeedback={async (mid, rating) => {
        try {
          await submitFeedback(mid, rating);
          toast.success("Thanks for the feedback");
          qc.invalidateQueries({ queryKey: ["stats"] });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed");
        }
      }}
    />
  );
}

function ChatWindow({
  threadId, initialMessages, loading, seed, onFeedback,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  loading: boolean;
  seed?: string;
  onFeedback: (messageId: string, rating: 1 | -1) => Promise<void>;
}) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"debug" | "simplify">("debug");
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      fetch: async (url, init) => {
        const headers = new Headers(init?.headers);
        headers.set("Content-Type", "application/json");
        const body = init?.body ? JSON.parse(init.body as string) : {};
        return fetch(url, { ...init, headers, body: JSON.stringify({ ...body, threadId, mode: modeRef.current }) });
      },
    }),
    [threadId]
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message),
  });

  // Save the conversation to MongoDB (through the Express API) once a turn is sent or finished,
  // not on every streamed token, and not when a saved chat is merely opened.
  const changedRef = useRef(false);
  useEffect(() => {
    if (status === "submitted") changedRef.current = true;
    if (!changedRef.current || status === "streaming" || messages.length === 0) return;
    if (status === "ready" || status === "error") changedRef.current = false;
    saveConversation(threadId, messages)
      .then(() => {
        qc.invalidateQueries({ queryKey: ["threads"] });
        qc.invalidateQueries({ queryKey: ["stats"] });
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not save chat"));
  }, [messages, status, threadId, qc]);

  const [input, setInput] = useState("");
  const [seeded, setSeeded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);


  useEffect(() => { textareaRef.current?.focus(); }, [threadId, status]);

  useEffect(() => {
    if (seed && !seeded && !loading && messages.length === 0) {
      setSeeded(true);
      setInput(seed);
    }
  }, [seed, seeded, loading, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-3 flex items-center gap-2 mono text-xs">
        <span className="text-primary">$</span>
        <span className="text-muted-foreground">session</span>
        <span>·</span>
        <span className="truncate">{threadId.slice(0, 8)}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6 space-y-6">
          {loading && (
            <div className="mono text-xs text-muted-foreground">loading history…</div>
          )}
          {messages.map((m) => (
            <Message key={m.id} m={m} onFeedback={onFeedback} />
          ))}
          {status === "submitted" && (
            <div className="flex items-center gap-2 mono text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              analyzing…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error.message}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSend} className="border-t border-border p-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 flex items-center gap-1 rounded-md border border-border bg-card p-1 w-fit">
            {([
              { id: "debug", label: "Debug", icon: Bug },
              { id: "simplify", label: "Simplify", icon: Wand2 },
            ] as const).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 mono text-[11px] transition ${
                  mode === m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                <m.icon className="h-3 w-3" /> {m.label}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-card focus-within:border-primary/60 focus-within:glow-ring transition">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={mode === "simplify"
                ? "Paste complex code to simplify…    (Shift+Enter for newline)"
                : "Paste code or describe the bug…    (Shift+Enter for newline)"}
              rows={3}
              className="mono block w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
              <span className="mono text-[10px] text-muted-foreground">
                {mode === "simplify" ? "refactors for readability, keeps behaviour" : "markdown + code fences supported"}
              </span>
              <button
                type="submit" disabled={busy || !input.trim()}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
              >
                <Send className="h-3 w-3" /> Send
              </button>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}

function Message({ m, onFeedback }: { m: UIMessage; onFeedback: (id: string, r: 1 | -1) => void }) {
  const text = m.parts?.map((p: any) => (p.type === "text" ? p.text : "")).join("") ?? "";
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-primary text-primary-foreground px-4 py-2.5 mono text-sm whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <img src={logo} alt="" className="h-6 w-6 mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="prose prose-invert max-w-none prose-pre:bg-[oklch(0.12_0.015_250)] prose-pre:border prose-pre:border-border prose-code:before:hidden prose-code:after:hidden prose-code:text-primary prose-headings:font-semibold text-sm">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <button onClick={() => onFeedback(m.id, 1)} className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-accent" aria-label="Helpful">
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onFeedback(m.id, -1)} className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-accent" aria-label="Not helpful">
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
