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
          <Button asChild className="w-full">
            <Link href="/user/signin">Iniciar sesión</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            Confirma tu dirección de correo para activar la cuenta.
          </p>
          {verify.error && (
            <p role="alert" className="text-sm text-red-600">
              {verify.error.message}
            </p>
          )}
          <Button
            type="button"
            className="w-full"
            disabled={!token || verify.isPending}
            onClick={() => token && verify.mutate({ token })}
          >
            {verify.isPending ? "Verificando..." : "Verificar mi correo"}
          </Button>
          {!token && (
            <p role="alert" className="text-sm text-red-600">
              El enlace no contiene un token válido. Solicita otro correo desde
              la pantalla de inicio de sesión.
            </p>
          )}
        </>
      )}
    </div>
  );
}
