// Página para la gestión de usuarios. Muestra la tabla de usuarios y controles de navegación.
import { UsersTable } from "@/components/usersTable";
import ReturnButton from "@/components/ReturnButton";
import TableTitle from "@/components/TableTitle";
import TableDescription from "@/components/TableDescription";

export default function UsersPage() {
  // Renderiza la interfaz principal de gestión de usuarios
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <ReturnButton />
            <TableTitle title="Gestión de Usuarios" />
          </div>
          <TableDescription description="Maneja las cuentas de los usuarios y sus roles dentro del sistema." />
        </div>
        {/* Tabla principal de usuarios */}
        <UsersTable />
      </div>
    </div>
  );
}
