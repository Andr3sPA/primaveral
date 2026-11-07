"use client";

import Link from "next/link";
import { ResendVerificationForm } from "@/components/ResendVerificationForm";

export default function ResendVerificationPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <h1 className="mb-2 text-3xl font-semibold">Reenviar verificación</h1>
      <p className="text-muted-foreground mb-6">
        Ingresa el correo usado al crear tu cuenta.
      </p>
      <ResendVerificationForm />
      <Link
        href="/user/signin"
        className="mt-6 inline-block text-sm underline underline-offset-4"
      >
        Volver a iniciar sesión
      </Link>
    </main>
  );
}
