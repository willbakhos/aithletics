import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { OpenRouterKeyForm } from "./OpenRouterKeyForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-2xl font-bold">Settings</h1>
      <section className="mt-6">
        <h2 className="text-sm font-semibold">OpenRouter API key</h2>
        <p className="mt-1 text-xs text-neutral-500">
          BYOK for MVP. Your key is encrypted with AES-256-GCM before being
          stored, and only decrypted server-side on coaching calls. It is never
          sent to the browser after being saved.
        </p>
        <div className="mt-4">
          <OpenRouterKeyForm hasKey={Boolean(user.openrouterKeyEncrypted)} />
        </div>
      </section>
    </main>
  );
}
