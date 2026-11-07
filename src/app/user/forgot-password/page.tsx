import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { Card, CardContent } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
      <Card>
        <CardContent className="p-6 sm:p-8">
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
