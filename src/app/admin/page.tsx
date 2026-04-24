import { AdminConsole } from "./AdminConsole";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Gated by <code className="font-mono text-xs">ADMIN_TOKEN</code>. The
        token never leaves this page&apos;s session storage and must be sent as an
        <code className="ml-1 font-mono text-xs">x-admin-token</code> header
        with every request.
      </p>
      <div className="mt-6">
        <AdminConsole />
      </div>
    </main>
  );
}
