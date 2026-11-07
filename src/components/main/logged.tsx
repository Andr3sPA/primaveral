"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

// Componente para mostrar el botón de cerrar sesión
export default function Logged() {
  const router = useRouter();

  return (
    <div className="mt-4 w-full">
      <Button
        onClick={() => {
          void signOut();
          router.push("/");
        }}
        variant={"destructive"}
        className="w-full"
      >
        Cerrar sesion
      </Button>
    </div>
  );
}
