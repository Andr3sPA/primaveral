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
        <p className="text-muted-foreground mt-2 text-base leading-6">
          Usa al menos 8 caracteres, con mayúscula, minúscula, número y símbolo.
        </p>
      </div>
      {!token ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-red-600">
            Este enlace no funciona o ya venció. Pide uno nuevo para cambiar tu
            contraseña.
          </p>
          <Button asChild className="min-h-11 w-full">
            <Link href="/user/forgot-password">Pedir un enlace nuevo</Link>
          </Button>
        </div>
      ) : !reset.data ? (
        <>
          <div className="grid gap-2">
            <label htmlFor="new-password" className="text-base font-medium">
              Nueva contraseña
            </label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              className="min-h-11"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="confirm-password" className="text-base font-medium">
              Confirmar contraseña
            </label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              className="min-h-11"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
          {passwordMismatch && (
            <p role="alert" className="text-sm text-red-600">
              Las contraseñas no coinciden.
            </p>
          )}
          {reset.error && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-red-600">
                {reset.error.message}
              </p>
              <Link
                href="/user/forgot-password"
                className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
              >
                Pedir un enlace nuevo
              </Link>
            </div>
          )}
          <Button
            type="submit"
            className="min-h-11 w-full"
            disabled={passwordMismatch || reset.isPending}
          >
            {reset.isPending ? "Actualizando..." : "Guardar contraseña"}
          </Button>
        </>
      ) : null}
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
