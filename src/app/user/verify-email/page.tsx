import { VerifyEmailForm } from "@/components/account-forms";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <h1 className="mb-4 text-3xl font-semibold">Verifica tu correo</h1>
      <VerifyEmailForm token={token ?? ""} />
    </main>
  );
}
