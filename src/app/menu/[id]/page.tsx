// Página de detalles de un elemento del menú. Muestra información detallada del ítem seleccionado.
import { MenuItemDetails } from "@/components/menu-item/menu-item-details";
import { api } from "@/trpc/server";
import Link from "next/link";

export default async function MenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Obtiene el id del elemento y sus detalles desde la API
  const { id } = await params;
  const item = await api.menu.getMenuItemDetails(id);

  // Renderiza los detalles del elemento del menú
  return (
    <div className="min-h-screen">
      {item ? (
        <div className="w-full max-w-2xl">
          <MenuItemDetails
            id={item.id}
            title={item.name}
            description={
              item.description ??
              "Prenda bordada para disfrutar por mucho tiempo."
            }
            prefix={item.currency}
            price={item.price}
            inStock={item.available && item.stock > 0}
            stockCount={item.stock}
            imageUrl={item.image ?? undefined}
            category={item.category}
            sizes={item.sizes ?? []}
            colors={item.colors ?? []}
            fulfillmentType={item.fulfillmentType}
            leadTimeDays={item.leadTimeDays}
          />
        </div>
      ) : (
        // Mensaje si el elemento no se encuentra
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">No encontramos esta prenda</h1>
          <p className="text-muted-foreground mt-3">
            Vuelve a la colección para ver las prendas disponibles.
          </p>
          <Link
            href="/#coleccion"
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-stone-900 px-6 text-white"
          >
            Volver a la colección
          </Link>
        </main>
      )}
    </div>
  );
}
