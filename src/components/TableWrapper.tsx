import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type { Table } from "@tanstack/react-table";

interface TableWrapperProps<TData> {
  table: Table<TData>;
}

export default function TableWrapper<TData>({
  table,
}: TableWrapperProps<TData>) {
  return (
    <div className="data-table-container">
      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  );
}
