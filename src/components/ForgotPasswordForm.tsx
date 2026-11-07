"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const request = api.user.requestPasswordReset.useMutation();

  return (
    <form
      className="w-full space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        request.mutate({ email });
      }}
    >
      <div>
        <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
        <p className="text-muted-foreground mt-2 text-base leading-6">
          Escribe el correo de tu cuenta y te enviaremos un enlace para cambiar
          la contraseña.
        </p>
      </div>
      {request.data ? (
        <p role="status">{request.data.message}</p>
      ) : (
        <>
          <div className="grid gap-2">
            <label htmlFor="forgot-email" className="text-base font-medium">
              Correo electrónico
            </label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              className="min-h-11"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          {request.error && (
            <p role="alert" className="text-sm text-red-600">
              {request.error.message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={request.isPending}>
            {request.isPending ? "Enviando..." : "Enviar enlace"}
          </Button>
        </>
      )}
      <Link
        href="/user/signin"
        className="flex min-h-11 items-center justify-center text-center text-sm underline underline-offset-4"
      >
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
