import { ProfileForm } from "@/components/ProfileForm";
import { MyOrders } from "@/components/MyOrders";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/server/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/user/signin");
  }

  return (
    <main className="botanical-page mx-auto w-full max-w-4xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-medium">Mi perfil</h1>
        <p className="text-muted-foreground">
          Administra tus datos y revisa el estado de tus compras.
        </p>
        <Button asChild size="lg" variant="outline" className="min-h-11">
          <Link href="#profile-details-heading">Editar mis datos</Link>
        </Button>
      </header>
      <MyOrders />
      <section aria-labelledby="profile-details-heading" className="space-y-4">
        <div>
          <h2 id="profile-details-heading" className="text-2xl font-medium">
            Mis datos
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Actualiza tu información y dirección para próximas compras.
          </p>
        </div>
        <Card className="rounded-2xl border-stone-200 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <ProfileForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
