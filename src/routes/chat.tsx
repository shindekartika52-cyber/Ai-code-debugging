import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, Settings, LayoutDashboard, Trash2, MessageSquareCode } from "lucide-react";
import logo from "@/assets/logo.png";
import { createThread, deleteThread, listThreads } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  component: ChatLayout,
});

function ChatLayout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const state = useRouterState({ select: (s) => s.location.pathname });
  const [query, setQuery] = useState("");

  const { data: threads = [] } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => listThreads(),
  });

  async function handleNew() {
    try {
      const t = await createThread();
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Delete this conversation?")) return;
    try {
      await deleteThread(id);
      qc.invalidateQueries({ queryKey: ["threads"] });
      if (state.includes(id)) navigate({ to: "/chat" });
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const filtered = threads.filter((t) => !query || t.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <img src={logo} alt="" className="h-6 w-6" />
          <span className="mono text-sm font-semibold">debug<span className="text-primary">.sh</span></span>
        </div>
        <div className="px-3">
          <button
            onClick={handleNew}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>
        <div className="px-3 mt-3 relative">
          <Search className="absolute left-5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full rounded-md border border-sidebar-border bg-background/60 pl-7 pr-2 py-1.5 text-xs outline-none focus:border-primary mono"
          />
        </div>
        <nav className="mt-3 flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 && (
            <div className="mono text-[11px] text-muted-foreground px-2 py-6 text-center">
              {"// no conversations yet"}
            </div>
          )}
          {filtered.map((t) => {
            const active = state.includes(t.id);
            return (
              <Link
                key={t.id}
                to="/chat/$threadId"
                params={{ threadId: t.id }}
                className={`group flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"}`}
              >
                <MessageSquareCode className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="flex-1 truncate">{t.title}</span>
                <button
                  onClick={(e) => handleDelete(t.id, e)}
                  className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-destructive/20"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-2 space-y-1">
          <Link to="/dashboard" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <Link to="/settings" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent">
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
