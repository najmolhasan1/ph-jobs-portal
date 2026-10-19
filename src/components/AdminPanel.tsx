"use client";

import { useCallback, useEffect, useState } from "react";
import type { JobDTO } from "@/lib/jobs-query";
import { cap, SOURCE_LABELS, timeAgo } from "@/lib/format";
import { SourceBadge } from "./JobCard";

type SourceRow = {
  key: string;
  name: string;
  kind: "direct" | "apify";
  enabled: boolean;
  config: Record<string, unknown>;
  intervalMinutes: number;
  state: "idle" | "checking" | "error";
  lastCheckAt?: string;
  lastSuccessAt?: string;
  nextCheckAt?: string;
  lastError?: string;
  consecutiveFailures: number;
  publishedToday: number;
};
type RunRow = {
  id: string;
  source: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  fetched: number;
  created: number;
  queued: number;
  merged: number;
  rejected: number;
  stale: number;
  error?: string;
};
type Overview = {
  counts: Record<string, number>;
  sources: SourceRow[];
  runs: RunRow[];
  config: {
    apify: boolean;
    apifyTokens: { name: string; creditLeftUsd: number | null; available: boolean }[];
    llm: boolean;
  };
};

const TOKEN_KEY = "ph-jobs-admin-token";
const btn = "rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-brand disabled:opacity-50";

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function inMinutes(iso?: string) {
  if (!iso) return "";
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  return m <= 0 ? "any moment" : `in ${m} min`;
}

/** A platform is "live" if the worker checked it within ~2 intervals. */
function workerAlive(s: SourceRow) {
  if (!s.lastCheckAt) return false;
  return Date.now() - new Date(s.lastCheckAt).getTime() < (s.intervalMinutes * 2 + 3) * 60_000;
}

export function AdminPanel() {
  const [token, setToken] = useState("");
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<"platforms" | "queue" | "log">("platforms");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [queue, setQueue] = useState<JobDTO[]>([]);
  const [queueStatus, setQueueStatus] = useState<"pending" | "rejected" | "approved">("pending");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setToken(readToken()), []);

  const api = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(path, {
        ...init,
        headers: { "Content-Type": "application/json", "x-admin-token": token, ...init?.headers },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setToken("");
        throw new Error("Wrong admin token");
      }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data as T;
    },
    [token],
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setError("");
      const [o, q] = await Promise.all([
        api<Overview>("/api/admin/overview"),
        api<{ jobs: JobDTO[] }>(`/api/jobs?status=${queueStatus}&limit=100`),
      ]);
      setOverview(o);
      setQueue(q.jobs);
    } catch (e) {
      setError(String((e as Error).message));
    }
  }, [api, token, queueStatus]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy("");
    }
  };

  if (!token) {
    return (
      <form
        className="mx-auto mt-10 max-w-sm space-y-3 rounded-xl border border-line bg-surface p-6"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            localStorage.setItem(TOKEN_KEY, draft);
          } catch {}
          setToken(draft);
        }}
      >
        <h1 className="text-lg font-semibold">Admin sign-in</h1>
        <p className="text-sm text-muted">Enter the ADMIN_TOKEN from your server&apos;s environment.</p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
          aria-label="Admin token"
          autoFocus
        />
        <button className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">Continue</button>
      </form>
    );
  }

  const c = overview?.counts ?? {};
  const enabled = overview?.sources.filter((s) => s.enabled) ?? [];
  const workerDown = enabled.length > 0 && enabled.every((s) => !workerAlive(s));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <button
          className={btn}
          onClick={() => {
            try {
              localStorage.removeItem(TOKEN_KEY);
            } catch {}
            setToken("");
          }}
        >
          Sign out
        </button>
      </div>

      {error && <div className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}
      {workerDown && (
        <div className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          The scraper worker isn&apos;t running — no platform has been checked recently. Start it with{" "}
          <code className="font-mono">npm run worker</code> (in production: as a PM2 / Railway worker process).
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["approved", "Live on portal"],
            ["pending", "Needs review"],
            ["rejected", "Filtered out"],
            ["expired", "Expired"],
          ] as const
        ).map(([s, label]) => (
          <div key={s} className="rounded-xl border border-line bg-surface p-4">
            <div className="text-2xl font-semibold tabular-nums">{c[s] ?? 0}</div>
            <div className="text-sm text-muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-line">
        {(
          [
            ["platforms", "Platforms"],
            ["queue", `Review${c.pending ? ` (${c.pending})` : ""}`],
            ["log", "Check log"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === k ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "platforms" && overview && (
        <section className="grid gap-3">
          {overview.sources.map((s) => (
            <PlatformCard
              key={s.key}
              source={s}
              busy={busy}
              apifyReady={overview.config.apify}
              onSave={(patch) => act(`save-${s.key}`, () => api(`/api/sources/${s.key}`, { method: "PATCH", body: JSON.stringify(patch) }))}
              onCheck={() => act(`check-${s.key}`, () => api(`/api/ingest/run?source=${s.key}`, { method: "POST" }))}
            />
          ))}
          {overview.config.apifyTokens.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-4 text-sm">
              <h3 className="mb-2 font-semibold">Apify tokens</h3>
              <p className="mb-2 text-xs text-muted">Paid platforms use the first token with credit and switch automatically when one runs out.</p>
              <ul className="space-y-1">
                {overview.config.apifyTokens.map((t) => (
                  <li key={t.name} className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs">{t.name}</span>
                    <span className={t.available ? "text-ok" : "text-danger"}>
                      {t.creditLeftUsd === null ? "credit unknown" : `${t.creditLeftUsd.toFixed(2)} left`}
                      {!t.available && " · used up"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted">
            Claude classifier: {overview.config.llm ? "on" : "off (set ANTHROPIC_API_KEY to auto-check Facebook posts and unstated levels)"}
          </p>
        </section>
      )}

      {tab === "queue" && (
        <section className="space-y-3">
          <div className="flex gap-2 text-sm">
            {(["pending", "rejected", "approved"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setQueueStatus(s)}
                className={`rounded-full px-3 py-1 ${queueStatus === s ? "bg-brand text-white" : "bg-surface-2 text-muted"}`}
              >
                {s === "pending" ? "Needs review" : s === "rejected" ? "Filtered out" : "Live"}
              </button>
            ))}
          </div>
          {queue.length === 0 && <p className="py-8 text-center text-sm text-muted">Nothing here.</p>}
          {queue.map((j) => (
            <article key={j.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{j.title}</h3>
                  <p className="text-sm text-muted">
                    {[j.company, j.location, j.experience].filter(Boolean).join(" · ") || "—"} · posted {timeAgo(j.postedAt)}
                  </p>
                  {j.reason && <p className="mt-1 text-xs text-warn">{cap(j.reason)}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {j.sources.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" title="Open original post">
                      <SourceBadge source={s.source} />
                    </a>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {j.status !== "approved" && (
                  <button
                    className="rounded-lg bg-ok px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    disabled={!!busy}
                    onClick={() => act(j.id, () => api(`/api/jobs/${j.id}`, { method: "PATCH", body: JSON.stringify({ status: "approved" }) }))}
                  >
                    Publish
                  </button>
                )}
                {j.status !== "rejected" && (
                  <button
                    className={btn}
                    disabled={!!busy}
                    onClick={() => act(j.id, () => api(`/api/jobs/${j.id}`, { method: "PATCH", body: JSON.stringify({ status: "rejected" }) }))}
                  >
                    {j.status === "approved" ? "Remove" : "Reject"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === "log" && overview && (
        <section className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                {["Platform", "When", "Status", "Fetched", "Published", "Review", "Duplicate", "Filtered", "Not today", "Error"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overview.runs.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-3 py-2">{SOURCE_LABELS[r.source]}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{timeAgo(r.startedAt)}</td>
                  <td className="px-3 py-2">
                    <span className={r.status === "DONE" ? "text-ok" : r.status === "FAILED" ? "text-danger" : "text-warn"}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{r.fetched}</td>
                  <td className="px-3 py-2 font-medium tabular-nums">{r.created}</td>
                  <td className="px-3 py-2 tabular-nums">{r.queued}</td>
                  <td className="px-3 py-2 tabular-nums">{r.merged}</td>
                  <td className="px-3 py-2 tabular-nums">{r.rejected}</td>
                  <td className="px-3 py-2 tabular-nums">{r.stale}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-danger" title={r.error}>{r.error}</td>
                </tr>
              ))}
              {!overview.runs.length && (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-muted">No checks yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function PlatformCard({
  source: s,
  busy,
  apifyReady,
  onSave,
  onCheck,
}: {
  source: SourceRow;
  busy: string;
  apifyReady: boolean;
  onSave: (patch: Partial<Pick<SourceRow, "enabled" | "intervalMinutes" | "config">>) => void;
  onCheck: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState(() => JSON.stringify(s.config, null, 2));
  const [minutes, setMinutes] = useState(s.intervalMinutes);
  const [jsonError, setJsonError] = useState("");

  const alive = workerAlive(s);
  const status = !s.enabled
    ? { label: "Off", cls: "bg-surface-2 text-muted" }
    : s.state === "checking"
      ? { label: "Checking now…", cls: "bg-brand-soft text-brand-text" }
      : s.state === "error"
        ? { label: "Error — retrying", cls: "bg-danger-soft text-danger" }
        : alive
          ? { label: "Active", cls: "bg-ok-soft text-ok" }
          : { label: "Waiting for worker", cls: "bg-warn-soft text-warn" };
  const needsApify = s.kind === "apify" && !apifyReady;
  const needsGroups = s.key === "facebook" && !((s.config.groups as string[] | undefined)?.length);

  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{s.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>
              {status.label === "Active" && <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-ok align-middle" />}
              {status.label}
            </span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
              {s.kind === "direct" ? "Free · direct feed" : "Apify · paid per item"}
            </span>
          </div>
          <p className="text-xs text-muted">
            Checks every {s.intervalMinutes} min
            {s.lastCheckAt && ` · last check ${timeAgo(s.lastCheckAt)}`}
            {s.enabled && s.nextCheckAt && s.state !== "checking" && ` · next ${inMinutes(s.nextCheckAt)}`}
            {` · ${s.publishedToday} published today`}
          </p>
          {s.enabled && s.lastError && <p className="text-xs text-danger">Last error: {s.lastError}</p>}
          {needsApify && <p className="text-xs text-warn">Add an Apify token (APIFY_TOKENS) to use this platform.</p>}
          {needsGroups && <p className="text-xs text-warn">Add public group URLs under Configure → &quot;groups&quot;, then switch it on.</p>}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={(e) => onSave({ enabled: e.target.checked })}
              className="size-4 accent-[var(--brand)]"
            />
            On
          </label>
          <button className={btn} disabled={!!busy || !s.enabled} onClick={onCheck}>
            {busy === `check-${s.key}` ? "Checking…" : "Check now"}
          </button>
          <button className={btn} onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Configure"}</button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            Check every
            <input
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-20 rounded-lg border border-line bg-bg px-2 py-1"
            />
            minutes
          </label>
          <div>
            <p className="mb-1 text-sm">Settings (JSON)</p>
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={10}
              spellCheck={false}
              className="w-full rounded-lg border border-line bg-bg p-3 font-mono text-xs outline-none focus:border-brand"
            />
            {jsonError && <p className="text-sm text-danger">{jsonError}</p>}
          </div>
          <button
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!!busy}
            onClick={() => {
              try {
                const config = JSON.parse(json);
                setJsonError("");
                onSave({ config, intervalMinutes: minutes });
              } catch {
                setJsonError("Invalid JSON");
              }
            }}
          >
            Save
          </button>
        </div>
      )}
    </article>
  );
}
