import { Card, CardContent } from "@/components/ui/card";
import { VerifyEmailForm } from "@/components/VerifyEmailForm";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
      <Card>
        <CardContent className="p-6 sm:p-8">
          <VerifyEmailForm
            token={typeof token === "string" ? token : undefined}
          />
        </CardContent>
      </Card>
    </main>
  );
}
