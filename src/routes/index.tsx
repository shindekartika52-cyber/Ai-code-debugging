import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="" className="h-7 w-7" />
          <span className="mono font-semibold tracking-tight">debug<span className="text-primary">.sh</span></span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/chat" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Open debugger
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-14">
        <div className="mono text-xs text-primary">$ ai --debug --language=any</div>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          Debug any code, in any language,<br />
          <span className="text-primary">without leaving the terminal.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Paste JavaScript, Python, Java, C++ — or anything else. Debug.sh identifies syntax, runtime, and
          logic errors, explains the root cause, and hands back corrected code. Every fix improves the model.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/chat" className="rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground hover:opacity-90 glow-ring">
            {"> Start debugging"}
          </Link>
        </div>

        <section className="mt-20 grid gap-4 md:grid-cols-3">
          {[
            { k: "01", t: "Multi-language", d: "First-class support for JS/TS, Python, Java, C++. SQL, Go, Rust also handled." },
            { k: "02", t: "Root cause, not vibes", d: "Every answer explains the underlying bug class and cites the offending lines." },
            { k: "03", t: "Learns from you", d: "Thumbs up/down on fixes. Aggregated (with consent) to sharpen future suggestions." },
          ].map((f) => (
            <div key={f.k} className="rounded-lg border border-border bg-card p-5">
              <div className="mono text-xs text-primary">{f.k}</div>
              <div className="mt-2 font-semibold">{f.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-lg border border-border bg-card p-6">
          <div className="mono text-xs text-muted-foreground">chat.log</div>
          <pre className="mono mt-3 whitespace-pre-wrap text-sm leading-relaxed"><span className="text-primary">user@debug</span>:~$ why does this Python fail?
<span className="text-muted-foreground">def avg(xs): return sum(xs) / len(xs)
avg([])  # ZeroDivisionError</span>

<span className="text-primary">debug.sh</span> → <span className="text-foreground">Root cause: division by zero when the input list is empty.
Fix: guard the length before dividing.</span>
<span className="text-muted-foreground">def avg(xs):
    if not xs: return 0.0
    return sum(xs) / len(xs)</span>
          </pre>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 mono text-xs text-muted-foreground">
          $ built with lovable · privacy-first · your code stays yours
        </div>
      </footer>
    </div>
  );
}
