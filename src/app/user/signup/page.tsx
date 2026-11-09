// Página de registro de usuario. Muestra el formulario de registro dentro de una tarjeta.
import { Signup1 } from "@/components/signup1";
import { CardContent, Card } from "@/components/ui/card";

export default function SignUpPage() {
  // Renderiza el formulario de registro de usuario
  return (
    <main className="botanical-page mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <Card className="rounded-2xl border-stone-200 shadow-sm">
        <CardContent className="p-0">
          {/* Formulario de registro */}
          <Signup1 />
        </CardContent>
      </Card>
    </main>
  );
}
