import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function SignInPage() {
  return (
    <main className="botanical-page mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-xl flex-col justify-center gap-8 px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="flex items-center justify-center gap-3 font-medium"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-stone-900 text-sm font-semibold text-white">
          PB
        </span>
        Primaveral Bordados
      </Link>
      <LoginForm className="bg-card/95 rounded-2xl border border-stone-200 p-6 shadow-sm backdrop-blur sm:p-8" />
    </main>
  );
}
