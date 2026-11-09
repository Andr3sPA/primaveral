"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";

export function Signup1() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const register = api.user.registerUser.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    register.mutate({
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      email,
      password,
    });
  };

  return (
    <section className="min-h-[calc(100svh-2rem)] py-2 sm:py-6">
      <div className="flex min-h-full items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="bg-card/95 flex w-full max-w-sm flex-col items-center gap-y-8 rounded-2xl border border-stone-200 px-4 py-8 shadow-sm backdrop-blur sm:px-6 sm:py-12"
        >
          <div className="flex flex-col items-center gap-y-2">
            <h1 className="text-center text-3xl font-semibold">Crear cuenta</h1>
            <p className="text-muted-foreground text-center text-sm">
              Solo necesitas tu correo y una contraseña. Después te enviaremos
              un mensaje para confirmar tu cuenta.
            </p>
          </div>
          {submitted ? (
            <div className="w-full space-y-4 text-center">
              <p role="status">
                Si puedes crear una cuenta con ese correo, recibirás un mensaje
                para confirmarla antes de iniciar sesión.
              </p>
              <p className="text-muted-foreground text-sm">
                Revisa también la carpeta de correo no deseado.
              </p>
              <Button asChild className="w-full">
                <Link href="/user/signin">Ir a iniciar sesión</Link>
              </Button>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="signup-email">Correo electrónico</Label>
                <Input
                  id="signup-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  className="min-h-11"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup-password">Contraseña</Label>
                <Input
                  id="signup-password"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  aria-describedby="signup-password-help"
                  className="min-h-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <p
                  id="signup-password-help"
                  className="text-muted-foreground text-sm leading-6"
                >
                  Usa 8 caracteres o más, con una mayúscula, una minúscula, un
                  número y un símbolo.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup-name">Nombre (opcional)</Label>
                <Input
                  id="signup-name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  className="min-h-11"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup-phone">Teléfono (opcional)</Label>
                <Input
                  id="signup-phone"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  maxLength={30}
                  className="min-h-11"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              {register.error && (
                <p role="alert" className="text-sm text-red-600">
                  {register.error.message}
                </p>
              )}
              <Button
                type="submit"
                className="mt-2 min-h-11 w-full"
                disabled={register.isPending}
              >
                {register.isPending ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </div>
          )}
          {!submitted && (
            <p className="text-muted-foreground text-sm">
              ¿Ya tienes una cuenta?{" "}
              <Link
                href="/user/signin"
                className="text-primary inline-flex min-h-11 items-center font-medium hover:underline"
              >
                Iniciar sesión
              </Link>
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
