interface TableTitleProps {
  title: string;
}

export default function TableTitle({ title }: TableTitleProps) {
  return <h1 className="text-3xl font-bold tracking-tight">{title}</h1>;
}
