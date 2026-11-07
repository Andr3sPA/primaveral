"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [response, setResponse] = useState({ status: "", info: "" });
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!validEmail || password.length < 8) {
      setResponse({
        status: "error",
        info: "Ingresa un correo válido y una contraseña de al menos 8 caracteres.",
      });
      return;
    }

    setResponse({ status: "loading", info: "Iniciando sesión..." });
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!result || result.error || !result.ok) {
        const errorMessage =
          result?.error === "CredentialsSignin"
            ? "Email o contraseña incorrectos. Si acabas de registrarte, verifica tu correo."
            : (result?.error ?? "No se pudo iniciar sesión.");
        setResponse({ status: "error", info: errorMessage });
        toast.error("Imposible iniciar sesión", {
          description: errorMessage,
        });
        return;
      }

      router.push("/");
    } catch {
      const errorMessage = "No se pudo conectar. Intenta nuevamente.";
      setResponse({ status: "error", info: errorMessage });
      toast.error("Imposible iniciar sesión", {
        description: errorMessage,
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex w-full flex-col gap-6", className)}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Inicia sesión</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Ingresa el correo y la contraseña de tu cuenta.
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              href="/user/forgot-password"
              className="min-h-11 py-3 text-right text-sm underline-offset-4 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {response.info && (
          <p
            className={`text-sm ${response.status === "error" ? "text-red-500" : "text-blue-500"}`}
            role={response.status === "error" ? "alert" : "status"}
          >
            {response.info}
          </p>
        )}
        <Button
          type="submit"
          className="min-h-11 w-full"
          disabled={response.status === "loading"}
        >
          {response.status === "loading" ? "Iniciando..." : "Iniciar sesión"}
        </Button>
      </div>
      <div className="text-center text-sm">
        ¿No recibiste el correo de verificación?{" "}
        <Link
          href="/user/resend-verification"
          className="underline underline-offset-4"
        >
          Reenviar verificación
        </Link>
      </div>
      <div className="text-center text-sm">
        ¿No tienes una cuenta?{" "}
        <Link href="/user/signup" className="underline underline-offset-4">
          Regístrate
        </Link>
      </div>
    </form>
  );
}
