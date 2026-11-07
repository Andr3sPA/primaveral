"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

export function VerifyEmailForm({ token }: { token?: string }) {
  const verify = api.user.verifyEmail.useMutation();

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Verifica tu correo</h1>
      {verify.data ? (
        <>
          <p role="status">{verify.data.message}</p>
          <Button asChild className="min-h-11 w-full">
            <Link href="/user/signin">Iniciar sesión</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-base leading-6">
            Confirma tu dirección de correo para activar la cuenta.
          </p>
          {verify.error && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-red-600">
                {verify.error.message}
              </p>
              <Link
                href="/user/resend-verification"
                className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
              >
                Pedir otro correo de confirmación
              </Link>
            </div>
          )}
          <Button
            type="button"
            className="min-h-11 w-full"
            disabled={!token || verify.isPending}
            onClick={() => token && verify.mutate({ token })}
          >
            {verify.isPending ? "Verificando..." : "Verificar mi correo"}
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
        </>
      )}
    </div>
  );
}
