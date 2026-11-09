import Link from "next/link";
import { Flower2 } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export default function SignInPage() {
  return (
    <main className="botanical-page mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-xl flex-col justify-center gap-8 px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="flex min-h-12 items-center justify-center gap-3 font-medium text-[#48235c]"
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f7e7a9] text-[#48235c]">
          <Flower2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="font-display text-2xl font-semibold">Primaveral</span>
      </Link>
      <LoginForm className="bg-card/95 rounded-2xl border border-stone-200 p-6 shadow-sm backdrop-blur sm:p-8" />
    </main>
  );
}
