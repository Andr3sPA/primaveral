import { DefaultLayout } from "@/components/defaultLayout";
import { OrdersCharts } from "@/components/ordersCharts";
import { api } from "@/trpc/server";
import { requireAdmin } from "@/server/auth/require-admin";

export default async function MetricsPage() {
  await requireAdmin();
  const orders = await api.order.getOrders();

  return (
    <DefaultLayout title="Métricas de la plataforma">
      <OrdersCharts orders={orders} />
    </DefaultLayout>
  );
}
