interface TableLoadingStateProps {
  message?: string;
}

export default function TableLoadingState({
  message = "Cargando datos...",
}: TableLoadingStateProps) {
  return (
    <div className="data-table-container">
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">{message}</div>
      </div>
    </div>
  );
}
