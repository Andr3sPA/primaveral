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
        <p className="text-muted-foreground mt-2 text-sm">
          Escribe el correo de tu cuenta y te enviaremos un enlace para cambiar
          la contraseña.
        </p>
      </div>
      {request.data ? (
        <p role="status">{request.data.message}</p>
      ) : (
        <>
          <Input
            type="email"
            autoComplete="email"
            aria-label="Correo electrónico"
            placeholder="Correo electrónico"
            maxLength={254}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
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
        className="block text-center text-sm underline underline-offset-4"
      >
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
