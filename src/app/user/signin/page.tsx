// Página de inicio de sesión de usuario. Muestra el formulario y una imagen decorativa.
import { LoginForm } from "@/components/login-form";
import { GalleryVerticalEnd } from "lucide-react";
import Image from "next/image";

export default function SignInPage() {
  // Renderiza el formulario de inicio de sesión y la imagen lateral
  return (
    <div className="grid min-h-[calc(100svh-5rem)] lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-4 sm:p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Acme Inc.
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            {/* Formulario de login */}
            <LoginForm />
          </div>
        </div>
      </div>
      {/* Imagen decorativa para la sección derecha */}
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="/placeholder.svg"
          alt="Image"
          width={1200}
          height={800}
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
