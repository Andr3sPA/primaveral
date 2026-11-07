// Página de registro de usuario. Muestra el formulario de registro dentro de una tarjeta.
import { Signup1 } from "@/components/signup1";
import { CardContent, Card } from "@/components/ui/card";

export default function SignUpPage() {
  // Renderiza el formulario de registro de usuario
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          {/* Formulario de registro */}
          <Signup1 />
        </CardContent>
      </Card>
    </div>
  );
}
