// Página para la gestión de pedidos desde el menú. Muestra la tabla de pedidos y controles de navegación.
import { OrdersTable } from "@/components/OrdersTable/OrdersTable";
import ReturnButton from "@/components/ReturnButton";
import TableDescription from "@/components/TableDescription";
import TableTitle from "@/components/TableTitle";

export default function OrdersMenuPage() {
  // Renderiza la interfaz principal de gestión de pedidos desde el menú
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <ReturnButton />
            <TableTitle title="Inventario de Menú" />
          </div>
          <TableDescription description="Gestiona los elementos del menú, incluyendo precios, disponibilidad e imágenes." />
        </div>
        {/* Tabla principal de pedidos */}
        <OrdersTable />
      </div>
    </div>
  );
}
