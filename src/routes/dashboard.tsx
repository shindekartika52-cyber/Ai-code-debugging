import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessagesSquare, ThumbsUp, ThumbsDown, GitBranch } from "lucide-react";
import { getStats } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({ queryKey: ["stats"], queryFn: async () => getStats() });
  const s = data ?? { threads: 0, messages: 0, positive: 0, negative: 0, topErrors: [], topLanguages: [] };
  const total = s.positive + s.negative;
  const rate = total ? Math.round((s.positive / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-3">
          <Link to="/chat" className="rounded-md p-1.5 hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <span className="mono text-xs text-muted-foreground">/ stats.log</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card icon={<GitBranch className="h-4 w-4 text-primary" />} label="Conversations" value={s.threads} />
          <Card icon={<MessagesSquare className="h-4 w-4 text-primary" />} label="Messages" value={s.messages} />
          <Card icon={<ThumbsUp className="h-4 w-4 text-primary" />} label="Helpful fixes" value={s.positive} />
          <Card icon={<ThumbsDown className="h-4 w-4 text-destructive" />} label="Needs work" value={s.negative} />
        </div>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mono text-xs text-primary">$ improvement --rate</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-4xl font-semibold">{rate}%</div>
            <div className="text-sm text-muted-foreground">of rated fixes marked helpful ({total} ratings)</div>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${rate}%` }} />
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="mono text-xs text-primary">$ top --errors</div>
            <h2 className="text-base font-semibold mt-1">Common error categories</h2>
            <ul className="mt-3 space-y-2">
              {s.topErrors.length === 0 && <li className="mono text-xs text-muted-foreground">// no data yet</li>}
              {s.topErrors.map(([cat, n]: [string, number]) => (
                <li key={cat} className="flex items-center justify-between text-sm">
                  <span className="mono uppercase text-primary">{cat}</span>
                  <span className="mono text-muted-foreground">{n}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="mono text-xs text-primary">$ top --languages</div>
            <h2 className="text-base font-semibold mt-1">Languages you debug</h2>
            <ul className="mt-3 space-y-2">
              {s.topLanguages.length === 0 && <li className="mono text-xs text-muted-foreground">// no data yet</li>}
              {s.topLanguages.map(([lang, n]: [string, number]) => (
                <li key={lang} className="flex items-center justify-between text-sm">
                  <span className="mono">{lang}</span>
                  <span className="mono text-muted-foreground">{n}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mono text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 text-3xl font-semibold mono">{value}</div>
    </div>
  );
}
