"use client";

import type { OrderStatus } from "@prisma/client";
import React from "react";
import {
  ResponsiveContainer,
  Pie,
  Cell,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  Line,
  PieChart,
  LineChart,
  BarChart,
  Bar,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RouterOutputs } from "@/trpc/react";

export function OrdersCharts({
  orders,
}: {
  orders: RouterOutputs["order"]["getOrders"];
}) {
  const [period, setPeriod] = React.useState("all");

  const filteredOrders = React.useMemo(() => {
    if (period === "all") return orders;

    const now = new Date();
    const startDate = new Date();
    if (period === "7d") startDate.setDate(now.getDate() - 7);
    else if (period === "30d") startDate.setDate(now.getDate() - 30);
    else if (period === "90d") startDate.setDate(now.getDate() - 90);
    return orders.filter((order) => new Date(order.createdAt) >= startDate);
  }, [orders, period]);

  const pieData = React.useMemo(() => {
    const counts = filteredOrders.reduce<Record<string, number>>(
      (acc, order) => {
        acc[order.status] = (acc[order.status] ?? 0) + 1;
        return acc;
      },
      {},
    );
    return Object.entries(counts).map(([status, count]) => ({
      name: status,
      value: count,
    }));
  }, [filteredOrders]);

  const lineData = React.useMemo(() => {
    const dailyTotals: Record<string, number> = {};
    filteredOrders.forEach((order) => {
      if (order.status === "DELIVERED") {
        const date = new Date(order.createdAt).toLocaleDateString();
        dailyTotals[date] = (dailyTotals[date] ?? 0) + order.total;
      }
    });
    const sortedData = Object.entries(dailyTotals)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, total]) => ({
        date,
        total,
      }));

    return sortedData;
  }, [filteredOrders]);

  const topProductsData = React.useMemo(() => {
    const productCounts: Record<string, number> = {};
    filteredOrders.forEach((order) => {
      order.orderItems.forEach((item) => {
        productCounts[item.menuItem.name] =
          (productCounts[item.menuItem.name] ?? 0) + item.quantity;
      });
    });

    const sortedProducts = Object.entries(productCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5);

    return sortedProducts.map(([name, count]) => ({
      name,
      quantity: count,
    }));
  }, [filteredOrders]);

  const averageOrderValueData = React.useMemo(() => {
    const dailyOrders: Record<string, { total: number; count: number }> = {};

    filteredOrders.forEach((order) => {
      if (order.status === "DELIVERED") {
        const date = new Date(order.createdAt).toLocaleDateString();
        dailyOrders[date] ??= { total: 0, count: 0 };
        dailyOrders[date].total += order.total;
        dailyOrders[date].count += 1;
      }
    });
    const sortedData = Object.entries(dailyOrders)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, { total, count }]) => ({
        date,
        average: count > 0 ? total / count : 0,
      }));

    return sortedData;
  }, [filteredOrders]);

  const statusColorMap: Record<OrderStatus, string> = {
    PENDING: "#facc15",
    PREPARING: "#f97316",
    READY: "#3b82f6",
    DELIVERED: "#22c55e",
    CANCELLED: "#ef4444",
  };

  const orderStatusTranslations: Record<OrderStatus, string> = {
    PENDING: "Pendiente",
    PREPARING: "Preparando",
    READY: "Listo",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Pie Chart */}
      <div className="bg-background rounded-xl border p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">Pedidos por estado</h2>
        {pieData.length === 0 ? (
          <div className="text-muted-foreground flex h-[300px] items-center justify-center">
            Sin datos
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={statusColorMap[entry.name as OrderStatus] || "#ccc"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  value,
                  orderStatusTranslations[name as OrderStatus],
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Line Chart */}
      <div className="bg-background rounded-xl border p-4 shadow">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Ingresos a lo largo del tiempo
          </h2>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el tiempo</SelectItem>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="90d">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {lineData.length === 0 ? (
          <div className="text-muted-foreground flex h-[300px] items-center justify-center">
            Sin datos
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                fill="#93c5fd"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top 5 Products Bar Chart */}
      <div className="bg-background rounded-xl border p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">
          Top 5 Productos más vendidos
        </h2>
        {topProductsData.length === 0 ? (
          <div className="text-muted-foreground flex h-[300px] items-center justify-center">
            Sin datos
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProductsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantity" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Average Order Value Line Chart */}
      <div className="bg-background rounded-xl border p-4 shadow">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Promedio de valor por pedido
          </h2>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el tiempo</SelectItem>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="90d">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {averageOrderValueData.length === 0 ? (
          <div className="text-muted-foreground flex h-[300px] items-center justify-center">
            Sin datos
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={averageOrderValueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="average" stroke="#f97316" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
