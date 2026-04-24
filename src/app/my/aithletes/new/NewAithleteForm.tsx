"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const POPULAR_MODELS = [
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3.5-haiku",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "google/gemini-2.0-flash-exp",
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-large-2411",
];

export function NewAithleteForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [model, setModel] = useState(POPULAR_MODELS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/aithletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, model }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "request failed");
        return;
      }
      const body = (await res.json()) as { aithlete: { id: string } };
      router.push(`/my/aithletes/${body.aithlete.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-400">Name</span>
        <input
          type="text"
          required
          minLength={2}
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-400">Coaching model (OpenRouter id)</span>
        <input
          type="text"
          required
          list="popular-models"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-sm focus:border-amber-500 focus:outline-none"
        />
        <datalist id="popular-models">
          {POPULAR_MODELS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </label>
      {error && <div className="text-sm text-rose-400">{error}</div>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-amber-500 py-2 font-medium text-black hover:bg-amber-400 disabled:opacity-50"
      >
        {pending ? "…" : "Create"}
      </button>
    </form>
  );
}
