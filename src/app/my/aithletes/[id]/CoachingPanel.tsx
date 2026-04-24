"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  aithleteId: string;
  callsUsed: number;
  raceFinishedAt: string | null;
}

export function CoachingPanel({ aithleteId, callsUsed, raceFinishedAt }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [response, setResponse] = useState<{
    rationale?: string;
    deltas?: Record<string, number>;
    error?: string;
    reasons?: string[];
  } | null>(null);

  const maxCalls = 3;
  const remaining = Math.max(0, maxCalls - callsUsed);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setResponse(null);
    try {
      const res = await fetch(`/api/aithletes/${aithleteId}/coaching`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        rationale?: string;
        deltas?: Record<string, number>;
        error?: string;
        reasons?: string[];
      };
      setResponse(body);
      if (res.ok) {
        setMessage("");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-neutral-500">
        {raceFinishedAt
          ? `Scoped to race finished ${new Date(raceFinishedAt).toLocaleString()}.`
          : "Scoped to last race."}{" "}
        {remaining} / {maxCalls} coaching calls remaining this race.
      </div>
      <form onSubmit={onSubmit} className="space-y-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="e.g. 'Yesterday you were fading in the last 30m. Can we shift a few points toward endurance?'"
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || remaining === 0 || message.trim().length < 4}
          className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
        >
          {pending ? "Coaching…" : "Send to coach"}
        </button>
      </form>
      {response && (
        <div className="rounded border border-neutral-800 bg-neutral-950 p-3 text-sm">
          {response.error ? (
            <div className="text-rose-400">
              {response.error}
              {response.reasons && (
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {response.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className="text-neutral-200">{response.rationale}</div>
              {response.deltas && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {Object.entries(response.deltas).map(([k, v]) => (
                    <span
                      key={k}
                      className={`rounded px-2 py-0.5 font-mono ${
                        v > 0
                          ? "bg-emerald-900/50 text-emerald-300"
                          : "bg-rose-900/50 text-rose-300"
                      }`}
                    >
                      {k} {v > 0 ? `+${v}` : v}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
