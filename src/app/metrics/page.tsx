import { DefaultLayout } from "@/components/defaultLayout";
import { OrdersCharts } from "@/components/ordersCharts";
import { api } from "@/trpc/server";

export default async function MetricsPage() {
  const orders = await api.order.getOrders();

  return (
    <DefaultLayout title="Métricas de la plataforma">
      <OrdersCharts orders={orders} />
    </DefaultLayout>
  );
}
