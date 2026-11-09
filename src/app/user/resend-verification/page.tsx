"use client";

import Link from "next/link";
import { ResendVerificationForm } from "@/components/ResendVerificationForm";
import { Card, CardContent } from "@/components/ui/card";

export default function ResendVerificationPage() {
  return (
    <main className="botanical-page mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
      <Card className="rounded-2xl border-stone-200 shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <h1 className="mb-2 text-3xl font-semibold">Confirmar mi correo</h1>
          <p className="text-muted-foreground mb-6 leading-6">
            Escribe la dirección correcta. Si tu cuenta aún no está confirmada,
            te enviaremos otro correo para confirmarla.
          </p>
          <ResendVerificationForm />
          <Link
            href="/user/signin"
            className="mt-6 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            Volver a iniciar sesión
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
