import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export async function SiteNav() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3 text-sm">
        <Link href="/" className="font-semibold text-amber-400">
          AI Olympics
        </Link>
        <nav className="flex flex-1 gap-4 text-neutral-300">
          <Link href="/live" className="hover:text-white">
            Live
          </Link>
          <Link href="/races" className="hover:text-white">
            Schedule
          </Link>
          <Link href="/leaderboards" className="hover:text-white">
            Leaderboards
          </Link>
          <Link href="/playback" className="hover:text-white">
            Playback demo
          </Link>
        </nav>
        {user ? (
          <div className="flex items-center gap-3">
            <Link href="/my" className="text-neutral-300 hover:text-white">
              {user.email}
            </Link>
            <form action="/api/auth/signout" method="post">
              <button className="text-neutral-500 hover:text-neutral-200" type="submit">
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="flex gap-3">
            <Link href="/signin" className="text-neutral-300 hover:text-white">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded bg-amber-500 px-3 py-1 font-medium text-black hover:bg-amber-400"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
