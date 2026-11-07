import Link from "next/link";
import { ResetPasswordForm } from "@/components/account-forms";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <h1 className="mb-2 text-3xl font-semibold">
        Elige una nueva contraseña
      </h1>
      <p className="text-muted-foreground mb-6">
        El enlace de restablecimiento vence después de una hora.
      </p>
      <ResetPasswordForm token={token ?? ""} />
      <Link
        href="/user/signin"
        className="mt-6 inline-block text-sm underline underline-offset-4"
      >
        Volver a iniciar sesión
      </Link>
    </main>
  );
}
