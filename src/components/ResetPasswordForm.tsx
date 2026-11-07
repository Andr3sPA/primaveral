"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";

export function ResetPasswordForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const reset = api.user.resetPassword.useMutation();
  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <form
      className="w-full space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (token && password === confirmPassword) {
          reset.mutate({ token, password });
        }
      }}
    >
      <div>
        <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Usa al menos 8 caracteres.
        </p>
      </div>
      {!reset.data && (
        <>
          <Input
            type="password"
            autoComplete="new-password"
            aria-label="Nueva contraseña"
            placeholder="Nueva contraseña"
            minLength={8}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            type="password"
            autoComplete="new-password"
            aria-label="Confirmar contraseña"
            placeholder="Confirmar contraseña"
            minLength={8}
            maxLength={128}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {passwordMismatch && (
            <p role="alert" className="text-sm text-red-600">
              Las contraseñas no coinciden.
            </p>
          )}
          {!token && (
            <p role="alert" className="text-sm text-red-600">
              El enlace no contiene un token válido.
            </p>
          )}
          {reset.error && (
            <p role="alert" className="text-sm text-red-600">
              {reset.error.message}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={!token || passwordMismatch || reset.isPending}
          >
            {reset.isPending ? "Actualizando..." : "Guardar contraseña"}
          </Button>
        </>
      )}
      {reset.data && (
        <>
          <p role="status">{reset.data.message}</p>
          <Button asChild className="w-full">
            <Link href="/user/signin">Iniciar sesión</Link>
          </Button>
        </>
      )}
    </form>
  );
}
