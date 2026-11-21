"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";

export function AccountSecurityForm() {
  const utils = api.useUtils();
  const {
    data: methods,
    isLoading,
    error: methodsError,
  } = api.user.getAuthenticationMethods.useQuery();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const setPasswordMutation = api.user.setPassword.useMutation({
    onSuccess: async () => {
      setPassword("");
      setConfirmation("");
      await utils.user.getAuthenticationMethods.invalidate();
    },
  });

  if (isLoading) {
    return (
      <p role="status" aria-live="polite" className="text-muted-foreground">
        Cargando métodos de acceso...
      </p>
    );
  }

  if (methodsError || !methods) {
    return (
      <p role="alert" className="text-sm text-red-800">
        No fue posible cargar tus métodos de acceso. Inténtalo más tarde.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <ul className="list-inside list-disc space-y-1 text-sm">
        {methods.googleLinked && <li>Tu cuenta está vinculada con Google.</li>}
        {methods.hasPassword && <li>También puedes entrar con contraseña.</li>}
      </ul>
      {!methods.hasPassword && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (password !== confirmation) {
              setPasswordMutation.reset();
              return;
            }
            setPasswordMutation.mutate({ password });
          }}
        >
          <div className="grid gap-2">
            <label
              htmlFor="account-new-password"
              className="text-sm font-medium"
            >
              Crear contraseña
            </label>
            <Input
              id="account-new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="account-password-help"
            />
            <p
              id="account-password-help"
              className="text-muted-foreground text-sm leading-6"
            >
              Usa al menos 8 caracteres, una mayúscula, una minúscula, un número
              y un símbolo.
            </p>
          </div>
          <div className="grid gap-2">
            <label
              htmlFor="account-confirm-password"
              className="text-sm font-medium"
            >
              Repetir contraseña
            </label>
            <Input
              id="account-confirm-password"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          {confirmation && password !== confirmation && (
            <p role="alert" className="text-sm text-red-700">
              Las contraseñas no coinciden.
            </p>
          )}
          {setPasswordMutation.error && (
            <p role="alert" className="text-sm text-red-700">
              {setPasswordMutation.error.message}
            </p>
          )}
          {setPasswordMutation.data && (
            <p role="status" className="text-sm text-emerald-700">
              {setPasswordMutation.data.message}
            </p>
          )}
          <Button
            type="submit"
            className="min-h-11"
            disabled={
              setPasswordMutation.isPending ||
              !password ||
              password !== confirmation
            }
          >
            {setPasswordMutation.isPending
              ? "Creando contraseña..."
              : "Crear contraseña"}
          </Button>
        </form>
      )}
    </div>
  );
}
