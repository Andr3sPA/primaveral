import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { Card, CardContent } from "@/components/ui/card";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="botanical-page mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
      <Card className="rounded-2xl border-stone-200 shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <ResetPasswordForm
            token={typeof token === "string" ? token : undefined}
          />
        </CardContent>
      </Card>
    </main>
  );
}
