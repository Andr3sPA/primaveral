"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function VerifyEmailForm({ token }: { token?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const verifyAndSignIn = async () => {
    if (!token) return;
    setPending(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        verificationToken: token,
        redirect: false,
        callbackUrl: "/",
      });
      if (result?.ok && !result.error) {
        router.replace(result.url ?? "/");
        router.refresh();
        return;
      }

      setError(
        "No pudimos confirmar e iniciar tu sesión. Puedes pedir otro correo de confirmación o iniciar sesión.",
      );
    } catch {
      setError(
        "No pudimos confirmar tu correo. Inténtalo de nuevo o inicia sesión.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Verifica tu correo</h1>
      <p className="text-muted-foreground text-base leading-6">
        Confirma tu dirección de correo para activar la cuenta e iniciar sesión.
      </p>
      {error && (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
          <Link
            href="/user/resend-verification"
            className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
          >
            Pedir otro correo de confirmación
          </Link>
          <Link
            href="/user/signin"
            className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      )}
      <Button
        type="button"
        className="min-h-11 w-full"
        disabled={!token || pending}
        onClick={() => void verifyAndSignIn()}
      >
        {pending ? "Confirmando e iniciando sesión..." : "Confirmar y entrar"}
      </Button>
      {!token && (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-red-600">
            El enlace no funciona o ya venció. Puedes pedir otro correo de
            confirmación.
          </p>
          <Button asChild variant="outline" className="min-h-11 w-full">
            <Link href="/user/resend-verification">
              Pedir otro correo de confirmación
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
