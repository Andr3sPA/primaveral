import { ProfileForm } from "@/components/ProfileForm";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/user/signin");
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-2 text-3xl font-medium">Mi perfil</h1>
      <p className="text-muted-foreground mb-6">
        Actualiza tus datos y guarda una dirección para próximas compras.
      </p>
      <Card className="border-stone-200 shadow-none">
        <CardContent className="p-6 sm:p-8">
          <ProfileForm />
        </CardContent>
      </Card>
    </main>
  );
}
