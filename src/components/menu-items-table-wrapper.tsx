import { api, HydrateClient } from "@/trpc/server";
import { MenuItemsTable } from "@/components/InventoryTable/MenuItemsTable";

export default async function MenuItemsTableWrapper() {
  // Prefetch the menu items data on the server
  await api.menu.getMenuItems.prefetch();

  return (
    <HydrateClient>
      <MenuItemsTable />
    </HydrateClient>
  );
}
