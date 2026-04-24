import Link from "next/link";
import { AuthForm } from "@/components/AuthForms";

export default function SignInPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mt-2 text-sm text-neutral-400">
        New here?{" "}
        <Link href="/signup" className="text-amber-400 hover:underline">
          Create an account
        </Link>
        .
      </p>
      <div className="mt-6">
        <AuthForm mode="signin" />
      </div>
    </main>
  );
}
