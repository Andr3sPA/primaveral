"use client";

// Componente para mostrar el formulario de registro de usuario

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";

interface Signup1Props {
  heading?: string;
  logo?: {
    url: string;
    src: string;
    alt: string;
    title?: string;
  };
  signupText?: string;
  loginText?: string;
  loginUrl?: string;
}

const Signup1 = ({
  heading = "Crear una Cuenta",
  logo = {
    url: "https://www.shadcnblocks.com",
    src: "https://shadcnblocks.com/images/block/logos/shadcnblockscom-wordmark.svg",
    alt: "logo",
    title: "shadcnblocks.com",
  },
  signupText = "Crear cuenta",
  loginText = "¿Ya tienes una cuenta?",
  loginUrl = "/login",
}: Signup1Props) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [registered, setRegistered] = useState<{
    email: string;
    verificationEmailSent: boolean;
  }>();

  const { mutate, error, isPending } = api.user.registerUser.useMutation({
    onSuccess: (user) => {
      setRegistered({
        email: user.email,
        verificationEmailSent: user.verificationEmailSent,
      });
    },
  });
  const resendVerification = api.user.resendVerificationEmail.useMutation();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate({ name, email, password });
  };

  return (
    <section className="bg-muted min-h-[calc(100svh-2rem)] py-2 sm:py-6">
      <div className="flex min-h-full items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="border-muted flex w-full max-w-sm flex-col items-center gap-y-8 rounded-md border bg-white px-4 py-8 shadow-md sm:px-6 sm:py-12"
        >
          <div className="flex flex-col items-center gap-y-2">
            {/* Logo */}
            {logo && (
              <div className="flex items-center gap-1 lg:justify-start">
                <a href={logo.url}>
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={160} // Added width
                    height={40} // Added height
                  />
                </a>
              </div>
            )}
            {heading && (
              <h1 className="text-center text-3xl font-semibold">{heading}</h1>
            )}
          </div>
          {registered ? (
            <div className="w-full space-y-4 text-center">
              <p className="font-medium">La cuenta se creó correctamente.</p>
              <p className="text-sm text-stone-600">
                {registered.verificationEmailSent
                  ? `Revisa ${registered.email} y verifica tu correo antes de iniciar sesión.`
                  : "No se pudo enviar el correo de verificación. Puedes volver a solicitarlo."}
              </p>
              {resendVerification.data && (
                <p className="text-sm text-emerald-700">
                  {resendVerification.data.message}
                </p>
              )}
              {resendVerification.error && (
                <p className="text-sm text-red-600">
                  {resendVerification.error.message}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={resendVerification.isPending}
                onClick={() =>
                  resendVerification.mutate({ email: registered.email })
                }
              >
                {resendVerification.isPending
                  ? "Enviando..."
                  : "Reenviar verificación"}
              </Button>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-8">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Input
                    type="text"
                    name="name"
                    placeholder="Nombre completo"
                    required
                    className="bg-white"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {error?.data?.zodError?.fieldErrors.name && (
                    <span className="text-xs text-red-500">
                      {error.data.zodError.fieldErrors.name}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Input
                    type="email"
                    name="email"
                    placeholder="Correo electrónico"
                    required
                    className="bg-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {error?.data?.zodError?.fieldErrors.email && (
                    <span className="text-xs text-red-500">
                      {error.data.zodError.fieldErrors.email}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Input
                    type="password"
                    name="password"
                    placeholder="Contraseña"
                    required
                    className="bg-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {error?.data?.zodError?.fieldErrors.password && (
                    <span className="text-xs text-red-500">
                      {error.data.zodError.fieldErrors.password}
                    </span>
                  )}
                </div>
                {error && !error.data?.zodError && error.message && (
                  <span className="text-xs text-red-500">
                    {error.message.includes("P2002")
                      ? "Ya existe una cuenta con este correo electrónico."
                      : error.message}
                  </span>
                )}
                <div className="flex flex-col gap-4">
                  <Button
                    type="submit"
                    className="mt-2 w-full"
                    disabled={isPending}
                  >
                    {isPending ? "Creando cuenta..." : signupText}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="text-muted-foreground flex justify-center gap-1 text-sm">
            <p>{loginText}</p>
            <a
              href={loginUrl}
              className="text-primary font-medium hover:underline"
            >
              Iniciar sesión
            </a>
          </div>
        </form>
      </div>
    </section>
  );
};

export { Signup1 };
