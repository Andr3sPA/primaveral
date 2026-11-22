"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { isGoogleOAuthInAppBrowser } from "@/lib/google-oauth-browser";

export function GoogleSignInButton({ enabled }: { enabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [inAppBrowser, setInAppBrowser] = useState(false);

  useEffect(() => {
    setInAppBrowser(isGoogleOAuthInAppBrowser(navigator.userAgent));
  }, []);

  const startSignIn = () => {
    setPending(true);
    setError("");
    void signIn("google", { callbackUrl: "/" })
      .then((result) => {
        if (result?.error) {
          setPending(false);
          setError("No pudimos conectar con Google. Inténtalo de nuevo.");
        }
      })
      .catch(() => {
        setPending(false);
        setError("No pudimos conectar con Google. Inténtalo de nuevo.");
      });
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        disabled={!enabled || pending}
        aria-busy={pending}
        onClick={startSignIn}
      >
        {pending
          ? "Conectando con Google..."
          : enabled
            ? "Continuar con Google"
            : "Inicio con Google no disponible"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {inAppBrowser && (
        <p role="note" className="text-muted-foreground text-center text-sm">
          Google puede bloquear el acceso desde el navegador integrado de
          algunas aplicaciones. Abre esta página en Chrome o Safari (menú de la
          aplicación → Abrir en el navegador) y vuelve a intentarlo.
        </p>
      )}
      {!enabled && (
        <p className="text-muted-foreground text-center text-sm">
          El acceso con Google aún no está configurado.
        </p>
      )}
    </div>
  );
}
