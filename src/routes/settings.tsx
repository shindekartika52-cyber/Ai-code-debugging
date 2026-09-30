import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteAllData, getProfile, updateProfile } from "@/lib/api";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data } = useQuery({ queryKey: ["profile"], queryFn: async () => getProfile() });
  const [displayName, setDisplayName] = useState("");
  const [allowTraining, setAllowTraining] = useState(false);
  const [anonymize, setAnonymize] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setDisplayName(data.display_name ?? "");
      setAllowTraining(!!data.allow_training);
      setAnonymize(!!data.anonymize_snippets);
    }
  }, [data]);

  async function save() {
    setSaving(true);
    try {
      await updateProfile({ display_name: displayName, allow_training: allowTraining, anonymize_snippets: anonymize });
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function wipe() {
    if (!confirm("Delete ALL your conversations and messages? This cannot be undone.")) return;
    try {
      await deleteAllData();
      qc.clear();
      toast.success("All data deleted");
      navigate({ to: "/chat" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-2xl px-6 py-4 flex items-center gap-3">
          <Link to="/chat" className="rounded-md p-1.5 hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="text-lg font-semibold">Settings</h1>
          <span className="mono text-xs text-muted-foreground">/ ~/.debugrc</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        <Section title="Profile" hint="$ whoami">
          <label className="block text-sm font-medium">Display name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm mono outline-none focus:border-primary" />
        </Section>

        <Section title="Privacy & training" hint="$ privacy --consent">
          <Toggle
            label="Allow anonymized data to improve future model recommendations"
            hint="When on, aggregated & anonymized fixes and feedback may be used to fine-tune future model versions. You can turn this off any time."
            checked={allowTraining} onChange={setAllowTraining}
          />
          <Toggle
            label="Anonymize code snippets before storage"
            hint="Replaces identifiers, string literals, and comments with placeholders when saving snippets tagged for training."
            checked={anonymize} onChange={setAnonymize}
          />
        </Section>

        <div className="flex justify-end gap-2">
          <button onClick={save} disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {saving ? "..." : "Save"}
          </button>
        </div>

        <Section title="Danger zone" hint="$ rm -rf ~/*">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Delete all conversations</div>
              <div className="text-xs text-muted-foreground">Removes every thread, message, and feedback record you own.</div>
            </div>
            <button onClick={wipe} className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive hover:bg-destructive/20">
              Delete everything
            </button>
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="mono text-xs text-primary">{hint}</div>
      <h2 className="text-base font-semibold mt-0.5">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <button
        type="button" onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition ${checked ? "bg-primary border-primary" : "bg-secondary border-border"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}
