"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function VerifyEmailForm({ token }: { token: string }) {
  const verifyEmail = api.user.verifyEmail.useMutation();

  if (!token) {
    return (
      <p className="text-sm text-red-600">
        El enlace de verificación no es válido.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {verifyEmail.data ? (
        <p className="text-sm text-emerald-700">{verifyEmail.data.message}</p>
      ) : verifyEmail.error ? (
        <p className="text-sm text-red-600">{verifyEmail.error.message}</p>
      ) : (
        <p className="text-sm text-stone-600">
          Confirma tu correo para activar el inicio de sesión.
        </p>
      )}
      {!verifyEmail.data && (
        <Button
          onClick={() => verifyEmail.mutate({ token })}
          disabled={verifyEmail.isPending}
        >
          {verifyEmail.isPending ? "Verificando..." : "Verificar correo"}
        </Button>
      )}
    </div>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const requestReset = api.user.requestPasswordReset.useMutation();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        requestReset.mutate({ email });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="reset-email">Correo electrónico</Label>
        <Input
          id="reset-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      {requestReset.data && (
        <p className="text-sm text-emerald-700">{requestReset.data.message}</p>
      )}
      {requestReset.error && (
        <p className="text-sm text-red-600">{requestReset.error.message}</p>
      )}
      <Button type="submit" disabled={requestReset.isPending}>
        {requestReset.isPending ? "Enviando..." : "Enviar instrucciones"}
      </Button>
    </form>
  );
}

export function ResendVerificationForm() {
  const [email, setEmail] = useState("");
  const resendVerification = api.user.resendVerificationEmail.useMutation();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        resendVerification.mutate({ email });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="verification-email">Correo electrónico</Label>
        <Input
          id="verification-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      {resendVerification.data && (
        <p className="text-sm text-emerald-700">
          {resendVerification.data.message}
        </p>
      )}
      {resendVerification.error && (
        <p className="text-sm text-red-600">
          {resendVerification.error.message}
        </p>
      )}
      <Button type="submit" disabled={resendVerification.isPending}>
        {resendVerification.isPending ? "Enviando..." : "Reenviar verificación"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const resetPassword = api.user.resetPassword.useMutation({
    onSuccess: (result) => setMessage(result.message),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    if (password !== confirmation) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    resetPassword.mutate({ token, password });
  };

  if (!token) {
    return <p className="text-sm text-red-600">El enlace no es válido.</p>;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="new-password">Nueva contraseña</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirmar contraseña</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </div>
      <p className="text-muted-foreground text-sm">
        Usa al menos 8 caracteres, con mayúscula, minúscula, número y símbolo.
      </p>
      {(message || resetPassword.error) && (
        <p
          className={`text-sm ${resetPassword.error ? "text-red-600" : "text-emerald-700"}`}
        >
          {message || resetPassword.error?.message}
        </p>
      )}
      {!resetPassword.data && (
        <Button type="submit" disabled={resetPassword.isPending}>
          {resetPassword.isPending ? "Guardando..." : "Actualizar contraseña"}
        </Button>
      )}
    </form>
  );
}

export function ProfileForm() {
  const { status } = useSession();
  const { data, isLoading, error } = api.user.getProfile.useQuery(undefined, {
    enabled: status === "authenticated",
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const updateProfile = api.user.updateProfile.useMutation();

  useEffect(() => {
    if (data) {
      setName(data.name ?? "");
      setPhone(data.phone ?? "");
      setAddress(data.address ?? "");
    }
  }, [data]);

  if (status === "loading" || isLoading) return <p>Cargando tu perfil...</p>;
  if (status === "unauthenticated") {
    return (
      <p className="text-sm text-stone-600">
        Inicia sesión para consultar y actualizar tu perfil.
      </p>
    );
  }
  if (error) return <p className="text-sm text-red-600">{error.message}</p>;
  if (!data) return <p>No se pudo cargar tu perfil.</p>;

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        updateProfile.mutate({ name, phone, address });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="profile-email">Correo electrónico</Label>
        <Input id="profile-email" value={data.email} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-name">Nombre</Label>
        <Input
          id="profile-name"
          autoComplete="name"
          maxLength={100}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-phone">Teléfono</Label>
        <Input
          id="profile-phone"
          type="tel"
          autoComplete="tel"
          maxLength={30}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-address">Dirección de entrega</Label>
        <Textarea
          id="profile-address"
          autoComplete="street-address"
          maxLength={250}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
      </div>
      {updateProfile.error && (
        <p className="text-sm text-red-600">{updateProfile.error.message}</p>
      )}
      {updateProfile.data && (
        <p className="text-sm text-emerald-700">Perfil actualizado.</p>
      )}
      <Button type="submit" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? "Guardando..." : "Guardar perfil"}
      </Button>
    </form>
  );
}
