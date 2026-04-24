"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OpenRouterKeyForm({ hasKey }: { hasKey: boolean }) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    const res = await fetch("/api/me/openrouter-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "failed");
      return;
    }
    setApiKey("");
    setStatus("Saved.");
    router.refresh();
  };

  const remove = async () => {
    await fetch("/api/me/openrouter-key", { method: "DELETE" });
    setStatus("Removed.");
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-neutral-400">
        Status: {hasKey ? "stored ✓" : "not set"}
      </div>
      <form onSubmit={save} className="space-y-3">
        <input
          type="password"
          placeholder="sk-or-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          minLength={16}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-sm focus:border-amber-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400"
          >
            Save
          </button>
          {hasKey && (
            <button
              type="button"
              onClick={remove}
              className="rounded border border-rose-700 px-4 py-2 text-sm text-rose-300 hover:bg-rose-950"
            >
              Remove stored key
            </button>
          )}
        </div>
      </form>
      {status && <div className="text-sm text-emerald-400">{status}</div>}
      {error && <div className="text-sm text-rose-400">{error}</div>}
    </div>
  );
}
