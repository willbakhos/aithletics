"use client";

import { useEffect, useState } from "react";

interface Config {
  raceIntervalMs: number;
  coachingWindowMs: number;
  maxEntries: number;
  paused: boolean;
}

export function AdminConsole() {
  const [token, setToken] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setToken(sessionStorage.getItem("aio_admin_token") ?? "");
  }, []);

  const load = async (tk: string) => {
    setError(null);
    setStatus(null);
    const res = await fetch("/api/admin/config", {
      headers: { "x-admin-token": tk },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "failed");
      return;
    }
    setConfig((await res.json()) as Config);
    setLoaded(true);
  };

  const persistToken = (tk: string) => {
    setToken(tk);
    sessionStorage.setItem("aio_admin_token", tk);
  };

  const save = async () => {
    if (!config) return;
    setStatus(null);
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "failed");
      return;
    }
    setStatus("Saved.");
  };

  const tick = async () => {
    setStatus(null);
    const res = await fetch("/api/admin/tick", {
      method: "POST",
      headers: { "x-admin-token": token },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "failed");
      return;
    }
    setStatus(`Ran ${body.ran ?? 0} due race(s).`);
  };

  if (!loaded) {
    return (
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">Admin token</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-sm focus:border-amber-500 focus:outline-none"
          />
        </label>
        <button
          onClick={() => {
            persistToken(token);
            void load(token);
          }}
          className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400"
        >
          Load config
        </button>
        {error && <div className="text-sm text-rose-400">{error}</div>}
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">
            Race interval (ms)
          </span>
          <input
            type="number"
            min={5000}
            value={config.raceIntervalMs}
            onChange={(e) =>
              setConfig({ ...config, raceIntervalMs: Number(e.target.value) })
            }
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">
            Coaching window (ms)
          </span>
          <input
            type="number"
            min={0}
            value={config.coachingWindowMs}
            onChange={(e) =>
              setConfig({ ...config, coachingWindowMs: Number(e.target.value) })
            }
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-400">Max entries</span>
          <input
            type="number"
            min={1}
            max={8}
            value={config.maxEntries}
            onChange={(e) =>
              setConfig({ ...config, maxEntries: Number(e.target.value) })
            }
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.paused}
            onChange={(e) => setConfig({ ...config, paused: e.target.checked })}
          />
          Pause race loop
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400"
        >
          Save config
        </button>
        <button
          onClick={tick}
          className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Tick now
        </button>
      </div>
      {status && <div className="text-sm text-emerald-400">{status}</div>}
      {error && <div className="text-sm text-rose-400">{error}</div>}
    </div>
  );
}
