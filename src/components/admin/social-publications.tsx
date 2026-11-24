"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const platforms = [
  {
    id: "FACEBOOK" as const,
    title: "Facebook",
    description: "Publicaciones en la página de Primaveral.",
  },
  {
    id: "INSTAGRAM" as const,
    title: "Instagram",
    description: "Publicaciones de imagen en la cuenta profesional conectada.",
  },
];

function statusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "En cola";
    case "PROCESSING":
      return "Procesando";
    case "WAITING_FOR_MEDIA":
      return "Preparando imagen";
    case "RETRY_WAIT":
      return "Reintento programado";
    case "PUBLISHED":
      return "Publicado";
    case "CANCELLED":
      return "Cancelado";
    default:
      return "Fallido";
  }
}

export function SocialPublications() {
  const [activePlatform, setActivePlatform] = useState<
    "FACEBOOK" | "INSTAGRAM" | null
  >(null);
  const utils = api.useUtils();
  const { data, isLoading, error } = api.publication.getStatus.useQuery(
    undefined,
    { refetchInterval: 30_000 },
  );
  const setEnabled = api.publication.setEnabled.useMutation({
    onSuccess: async () => {
      toast.success("Configuración actualizada");
      await utils.publication.getStatus.invalidate();
    },
    onError: (mutationError) => toast.error(mutationError.message),
    onSettled: () => setActivePlatform(null),
  });
  const retry = api.publication.retry.useMutation({
    onSuccess: async () => {
      toast.success("Publicación añadida a la cola");
      await utils.publication.getStatus.invalidate();
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  if (isLoading) {
    return <p className="text-sm text-stone-500">Cargando estado social...</p>;
  }
  if (error || !data) {
    return (
      <p role="alert" className="text-sm text-red-700">
        {error?.message ?? "No se pudo cargar la configuración social."}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-medium">Publicación en redes</h2>
          <p className="mt-1 text-sm text-stone-500">
            Activa las plataformas que quieras usar. Cada publicación se inicia
            desde el producto, permite elegir las redes y redactar un texto
            distinto; crear o editar un producto nunca lo publica.
          </p>
          <p className="mt-2 text-sm text-amber-900">
            Tener las variables configuradas no confirma App Review, permisos,
            tareas de Página ni PPA. Verifica esos requisitos con Meta antes de
            activar producción.
          </p>
        </div>
        {!data.configuration.cronConfigured && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            Configura <code>CRON_SECRET</code> en el entorno del servidor para
            que Vercel procese la cola.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {platforms.map((platform) => {
            const setting =
              platform.id === "FACEBOOK"
                ? data.settings.facebookEnabled
                : data.settings.instagramEnabled;
            const configuration =
              platform.id === "FACEBOOK"
                ? data.configuration.facebook
                : data.configuration.instagram;
            return (
              <Card key={platform.id} className="border-stone-200 shadow-none">
                <CardContent className="space-y-4 p-5">
                  <div>
                    <h3 className="font-medium">{platform.title}</h3>
                    <p className="mt-1 text-sm text-stone-500">
                      {platform.description}
                    </p>
                  </div>
                  {!configuration.configured && (
                    <p className="text-xs text-amber-800">
                      Faltan variables: {configuration.missing.join(", ")}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant={setting ? "outline" : "default"}
                    disabled={
                      setEnabled.isPending ||
                      (!setting && !configuration.configured)
                    }
                    onClick={() => {
                      setActivePlatform(platform.id);
                      setEnabled.mutate({
                        platform: platform.id,
                        enabled: !setting,
                      });
                    }}
                  >
                    {activePlatform === platform.id
                      ? "Guardando..."
                      : setting
                        ? "Desactivar"
                        : "Activar"}
                  </Button>
                  <p className="text-xs text-stone-500">
                    Estado: {setting ? "activado" : "desactivado"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-medium">Publicaciones recientes</h2>
          <p className="mt-1 text-sm text-stone-500">
            Se muestran hasta 50 productos y su estado por plataforma.
          </p>
        </div>
        {data.publications.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-sm text-stone-500">
            Todavía no hay publicaciones en la cola.
          </p>
        ) : (
          <div className="space-y-3">
            {data.publications.map((publication) => (
              <Card
                key={publication.id}
                className="border-stone-200 shadow-none"
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {publication.menuItem.name}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      {publication.platform} · {statusLabel(publication.status)}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Intentos: {publication.attempts} · Actualizado:{" "}
                      {new Date(publication.updatedAt).toLocaleString("es-CO")}
                    </p>
                    {(publication.status === "RETRY_WAIT" ||
                      publication.status === "WAITING_FOR_MEDIA") && (
                      <p className="mt-1 text-xs text-stone-500">
                        Próximo intento:{" "}
                        {new Date(publication.nextAttemptAt).toLocaleString(
                          "es-CO",
                        )}
                      </p>
                    )}
                    {publication.lastErrorMessage && (
                      <p className="mt-2 text-sm text-red-700">
                        {publication.lastErrorMessage}
                      </p>
                    )}
                    {publication.lastErrorCode && (
                      <p className="mt-1 text-xs text-stone-500">
                        Código de error: {publication.lastErrorCode}
                      </p>
                    )}
                    {publication.externalPostId && (
                      <p className="mt-1 text-xs break-all text-stone-500">
                        ID externo: {publication.externalPostId}
                      </p>
                    )}
                  </div>
                  {publication.status === "FAILED" && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={retry.isPending}
                      onClick={() => {
                        const confirmNoExternalPost =
                          publication.lastErrorCode === "OUTCOME_UNKNOWN";
                        if (
                          confirmNoExternalPost &&
                          !window.confirm(
                            "Revisa primero Facebook o Instagram. ¿Confirmas que esta publicación no existe y quieres reintentar?",
                          )
                        ) {
                          return;
                        }
                        retry.mutate({
                          id: publication.id,
                          confirmNoExternalPost,
                        });
                      }}
                    >
                      {publication.lastErrorCode === "OUTCOME_UNKNOWN"
                        ? "Confirmar ausencia y reintentar"
                        : "Reintentar"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
