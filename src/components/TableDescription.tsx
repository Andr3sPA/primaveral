// Componente para mostrar la descripción de una tabla
interface TableDescriptionProps {
  description: string;
}

export default function TableDescription({
  description,
}: TableDescriptionProps) {
  return <p className="text-muted-foreground">{description}</p>;
}
