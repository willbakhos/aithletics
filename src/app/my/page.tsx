import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MyDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const aithletes = await prisma.aithlete.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold">Your Aithletes</h1>
      <p className="mt-1 text-sm text-neutral-400">Signed in as {user.email}.</p>

      <div className="mt-6 flex gap-3 text-sm">
        <Link
          href="/my/aithletes/new"
          className="rounded bg-amber-500 px-4 py-2 font-medium text-black hover:bg-amber-400"
        >
          + New Aithlete
        </Link>
        <Link
          href="/my/settings"
          className="rounded border border-neutral-700 px-4 py-2 text-neutral-200 hover:bg-neutral-800"
        >
          OpenRouter key
        </Link>
      </div>

      <section className="mt-8">
        {aithletes.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No Aithletes yet. Create one to start racing.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900">
            {aithletes.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`/my/aithletes/${a.id}`}
                    className="font-medium hover:underline"
                  >
                    {a.name}
                  </Link>
                  <div className="text-xs text-neutral-500">{a.chosenModel}</div>
                </div>
                <div className="text-right text-xs text-neutral-500">
                  <div>
                    {a.wins} / {a.totalRaces} W
                  </div>
                  <Link
                    href={`/aithletes/${a.id}`}
                    className="text-amber-400 hover:underline"
                  >
                    public profile →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-xs text-neutral-500">
        MVP is BYOK — add your OpenRouter key in settings to enable coaching
        calls. Max 3 coaching calls per race per user. 4000/1500 token budget.
      </div>
    </main>
  );
}
