import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { createThread } from "@/lib/api";
import { Terminal } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/chat/")({
  component: ChatIndex,
});

function ChatIndex() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function start(seed?: string) {
    try {
      const t = await createThread();
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: t.id }, search: seed ? { seed } : undefined });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const prompts = [
    { lang: "python", text: "Why does this Python raise IndexError?\n\n```python\ndef last(xs):\n    return xs[len(xs)]\n```" },
    { lang: "javascript", text: "This JS returns undefined instead of the sum:\n\n```javascript\nfunction sum(a,b){\n  a+b\n}\n```" },
    { lang: "cpp", text: "Segfault when reading input:\n\n```cpp\nint* p; *p = 42;\n```" },
    { lang: "java", text: "NullPointerException in this Java snippet:\n\n```java\nString s = null; s.length();\n```" },
  ];

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        <Terminal className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-3xl font-semibold">What are we debugging?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste code, an error message, or a stack trace. I'll classify the bug and hand back a fix.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2 text-left">
          {prompts.map((p) => (
            <button
              key={p.lang}
              onClick={() => start(p.text)}
              className="rounded-md border border-border bg-card p-4 hover:border-primary/60 hover:bg-accent transition"
            >
              <div className="mono text-[10px] uppercase text-primary">{p.lang}</div>
              <div className="mt-1 mono text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                {p.text.split("\n").slice(0, 3).join("\n")}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-8">
          <button
            onClick={() => start()}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 glow-ring"
          >
            {"> Start a blank chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
