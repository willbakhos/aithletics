"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "signin" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "request failed");
        return;
      }
      router.push("/my");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-400">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-neutral-400">Password</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </label>
      {error && <div className="text-sm text-rose-400">{error}</div>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-amber-500 py-2 font-medium text-black hover:bg-amber-400 disabled:opacity-50"
      >
        {pending ? "…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
