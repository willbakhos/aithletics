import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { NewAithleteForm } from "./NewAithleteForm";

export default async function NewAithletePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  return (
    <main className="mx-auto max-w-sm px-6 py-10">
      <h1 className="text-2xl font-bold">New Aithlete</h1>
      <p className="mt-2 text-sm text-neutral-400">
        All Aithletes start with identical baseline attributes. Your coaching
        moves them from there within a 100-point budget.
      </p>
      <div className="mt-6">
        <NewAithleteForm />
      </div>
    </main>
  );
}
