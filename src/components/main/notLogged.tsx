import ButtonLink from "@/components/main/buttonLink";

export default async function NotLogged() {
  return (
    <div className="mt-4 flex flex-col justify-center gap-4">
      <ButtonLink href="/user/signin">Iniciar sesion</ButtonLink>
      <ButtonLink href="/user/signup">Registrarse</ButtonLink>
    </div>
  );
}
