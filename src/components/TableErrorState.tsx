interface TableErrorStateProps {
  message: string;
}

export default function TableErrorState({ message }: TableErrorStateProps) {
  return (
    <div className="data-table-container">
      <div className="flex h-64 items-center justify-center">
        <div className="text-destructive">{message}</div>
      </div>
    </div>
  );
}
