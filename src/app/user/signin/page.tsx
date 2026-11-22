import Link from "next/link";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { env } from "@/env";

const googleSignInErrors: Record<string, string> = {
  GoogleEmailNotVerified:
    "Google no confirmó que el correo sea tuyo. Verifica tu correo en Google e inténtalo otra vez.",
  AccountNotVerified:
    "Ya existe una cuenta con ese correo. Confirma su correo antes de vincular Google.",
  OAuthAccountNotLinked:
    "Esa cuenta de Google ya está vinculada a otra cuenta de Primaveral. Inicia sesión con el método que usaste originalmente.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error } = await searchParams;
  const errorCode = typeof error === "string" ? error : "";

  return (
    <main className="botanical-page mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-xl flex-col justify-center gap-8 px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="flex min-h-12 items-center justify-center gap-3 font-medium text-[#48235c]"
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f7e7a9] text-[#48235c]">
          <Image
            src="/primaveral-flower.png"
            width={32}
            height={27}
            alt=""
            aria-hidden="true"
            className="h-7 w-8 object-contain"
          />
        </span>
        <span className="font-script text-2xl leading-tight font-medium text-[#875f00]">
          Primaveral
        </span>
      </Link>
      <LoginForm
        googleEnabled={Boolean(env.OAUTH_CLIENT_ID && env.OAUTH_CLIENT_SECRET)}
        googleError={googleSignInErrors[errorCode]}
        className="bg-card/95 rounded-2xl border border-stone-200 p-6 shadow-sm backdrop-blur sm:p-8"
      />
    </main>
  );
}
