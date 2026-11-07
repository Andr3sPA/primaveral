// Componente para mostrar el saludo principal en la página de inicio
export default function TitleGreeting() {
  return (
    <div className="flex flex-col gap-y-5">
      <h1 className="text-4xl font-bold">Bienvenido al restaurante!</h1>
      <h2 className="text-2xl font-bold">Menu</h2>
    </div>
  );
}
