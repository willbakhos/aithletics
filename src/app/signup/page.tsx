import Link from "next/link";
import { AuthForm } from "@/components/AuthForms";

export default function SignUpPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-bold">Create an account</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Already have one?{" "}
        <Link href="/signin" className="text-amber-400 hover:underline">
          Sign in
        </Link>
        .
      </p>
      <div className="mt-6">
        <AuthForm mode="signup" />
      </div>
    </main>
  );
}
