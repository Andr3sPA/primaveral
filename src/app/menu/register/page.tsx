// Página para registrar nuevos elementos en el menú.
import RegisterMenuItem from "@/components/registerMenuItem";
import { Card, CardContent } from "@/components/ui/card";

export default function RegisterMenuPage() {
  // Renderiza el formulario de registro de un nuevo elemento del menú
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          {/* Formulario de registro de menú */}
          <RegisterMenuItem />
        </CardContent>
      </Card>
    </div>
  );
}
