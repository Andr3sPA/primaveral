"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <section className="bg-muted min-h-[calc(100svh-2rem)] py-2 sm:py-6">
      <div className="flex min-h-full items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="border-muted flex w-full max-w-sm flex-col items-center gap-y-8 rounded-md border bg-white px-4 py-8 shadow-md sm:px-6 sm:py-12"
        >
          <div className="flex flex-col items-center gap-y-2">
            <h1 className="text-center text-3xl font-semibold">Crear cuenta</h1>
            <p className="text-muted-foreground text-center text-sm">
              Regístrate con tu correo y contraseña. Nombre y teléfono son
              opcionales.
            </p>
          </div>
          {submitted ? (
            <div className="w-full space-y-4 text-center">
              <p role="status">
                Si la cuenta puede registrarse, recibirás un correo para
                verificarla antes de iniciar sesión.
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
              <Input
                type="email"
                name="email"
                placeholder="Correo electrónico"
                aria-label="Correo electrónico"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Input
                type="password"
                name="password"
                placeholder="Contraseña (8+ caracteres, mayúscula, número y símbolo)"
                aria-label="Contraseña"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Usa al menos 8 caracteres, con mayúscula, minúscula, número y
                símbolo.
              </p>
              <Input
                type="text"
                name="name"
                placeholder="Nombre (opcional)"
                aria-label="Nombre (opcional)"
                autoComplete="name"
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Input
                type="tel"
                name="phone"
                placeholder="Teléfono (opcional)"
                aria-label="Teléfono (opcional)"
                autoComplete="tel"
                maxLength={30}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              {register.error && (
                <p role="alert" className="text-sm text-red-600">
                  {register.error.message}
                </p>
              )}
              <Button
                type="submit"
                className="mt-2 w-full"
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
                className="text-primary font-medium hover:underline"
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
