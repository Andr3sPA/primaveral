"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";

export function ResendVerificationForm() {
  const [email, setEmail] = useState("");
  const resend = api.user.requestEmailVerification.useMutation();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        resend.mutate({ email });
      }}
    >
      <label htmlFor="verification-email" className="text-sm font-medium">
        Correo electrónico
      </label>
      <Input
        id="verification-email"
        type="email"
        autoComplete="email"
        maxLength={254}
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      {resend.data && (
        <p role="status" className="text-sm text-emerald-700">
          {resend.data.message}
        </p>
      )}
      {resend.error && (
        <p role="alert" className="text-sm text-red-600">
          {resend.error.message}
        </p>
      )}
      <Button type="submit" disabled={resend.isPending}>
        {resend.isPending ? "Enviando..." : "Reenviar verificación"}
      </Button>
    </form>
  );
}
