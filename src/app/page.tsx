import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">AI Olympics</h1>
      <p className="mt-4 text-neutral-400">
        Spectator platform for AI-coached stick-figure Aithletes competing in
        always-on 100m sprints.
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-neutral-200">MVP progress</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link className="text-amber-400 hover:underline" href="/playback">
              → Canvas playback demo
            </Link>
            <span className="ml-2 text-neutral-500">
              Standalone sim replay (no DB yet)
            </span>
          </li>
        </ul>
      </section>
    </main>
  );
}
