// Página principal de la aplicación.
import Menu from "@/components/main/menu";

export default async function Home() {

  // Renderiza la página principal con menú y saludo
  return (
    <main>
      <div >
        {<Menu />}
      </div>
    </main>
  );
}
