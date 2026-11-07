"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type FormResponse = {
  status: "idle" | "loading" | "error" | "ok";
  info: string;
};

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [response, setResponse] = useState<FormResponse>({
    status: "idle",
    info: "",
  });
  const router = useRouter();
  const requestVerification = api.user.requestEmailVerification.useMutation({
    onSuccess: ({ message }) => setResponse({ status: "ok", info: message }),
    onError: (error) => setResponse({ status: "error", info: error.message }),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResponse({ status: "loading", info: "Iniciando sesión..." });
    void signIn("credentials", {
      email,
      password,
      redirect: false,
    })
      .then((result) => {
        if (!result || result.error || !result.ok) {
          setResponse({
            status: "error",
            info: "Correo o contraseña incorrectos, o la cuenta todavía no está verificada.",
          });
          return;
        }

        setResponse({ status: "ok", info: "Inicio de sesión exitoso." });
        router.push("/");
      })
      .catch(() => {
        setResponse({
          status: "error",
          info: "No fue posible iniciar sesión. Inténtalo de nuevo.",
        });
      });
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
          Accede a tu cuenta de Primaveral Bordados.
        </p>
      </div>
      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
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
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {response.info && (
          <p
            role={response.status === "error" ? "alert" : "status"}
            className={cn(
              "text-sm",
              response.status === "error" && "text-red-600",
              response.status === "ok" && "text-emerald-700",
              response.status === "loading" && "text-blue-600",
            )}
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
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          disabled={!email || requestVerification.isPending}
          onClick={() => requestVerification.mutate({ email })}
        >
          {requestVerification.isPending
            ? "Enviando..."
            : "Reenviar correo de verificación"}
        </Button>
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
