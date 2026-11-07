"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";

type ProfileFields = {
  name: string;
  phone: string;
  address: string;
  municipality: string;
  department: string;
};

const emptyFields: ProfileFields = {
  name: "",
  phone: "",
  address: "",
  municipality: "",
  department: "",
};

export function ProfileForm() {
  const utils = api.useUtils();
  const { data: profile, isLoading, error } = api.user.getProfile.useQuery();
  const [fields, setFields] = useState(emptyFields);
  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: async (updatedProfile) => {
      utils.user.getProfile.setData(undefined, updatedProfile);
      await utils.user.getProfile.invalidate();
    },
  });

  useEffect(() => {
    if (profile) {
      setFields({
        name: profile.name ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        municipality: profile.municipality ?? "",
        department: profile.department ?? "",
      });
    }
  }, [profile]);

  const updateField = (field: keyof ProfileFields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando tu perfil...</p>;
  }

  if (error || !profile) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {error?.message ?? "No fue posible cargar el perfil."}
      </p>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        updateProfile.mutate({
          name: fields.name,
          phone: fields.phone,
          address: fields.address,
          municipality: fields.municipality,
          department: fields.department,
        });
      }}
    >
      <div>
        <label
          htmlFor="profile-email"
          className="mb-2 block text-sm font-medium"
        >
          Correo electrónico
        </label>
        <Input id="profile-email" value={profile.email} disabled />
        <p className="text-muted-foreground mt-1 text-xs">
          El correo se verifica al crear la cuenta y no se cambia desde aquí.
        </p>
      </div>
      <div>
        <label
          htmlFor="profile-name"
          className="mb-2 block text-sm font-medium"
        >
          Nombre (opcional)
        </label>
        <Input
          id="profile-name"
          autoComplete="name"
          maxLength={100}
          value={fields.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
      </div>
      <div>
        <label
          htmlFor="profile-phone"
          className="mb-2 block text-sm font-medium"
        >
          Teléfono (opcional)
        </label>
        <Input
          id="profile-phone"
          type="tel"
          autoComplete="tel"
          maxLength={30}
          value={fields.phone}
          onChange={(event) => updateField("phone", event.target.value)}
        />
      </div>
      <div className="border-t border-stone-200 pt-5">
        <h2 className="font-medium">Dirección de entrega</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Si la guardas aquí, podrás seleccionarla al finalizar una compra.
        </p>
      </div>
      <div>
        <label
          htmlFor="profile-address"
          className="mb-2 block text-sm font-medium"
        >
          Dirección
        </label>
        <Input
          id="profile-address"
          autoComplete="street-address"
          maxLength={250}
          value={fields.address}
          onChange={(event) => updateField("address", event.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="profile-municipality"
            className="mb-2 block text-sm font-medium"
          >
            Municipio
          </label>
          <Input
            id="profile-municipality"
            autoComplete="address-level2"
            maxLength={100}
            value={fields.municipality}
            onChange={(event) =>
              updateField("municipality", event.target.value)
            }
          />
        </div>
        <div>
          <label
            htmlFor="profile-department"
            className="mb-2 block text-sm font-medium"
          >
            Departamento
          </label>
          <Input
            id="profile-department"
            autoComplete="address-level1"
            maxLength={100}
            value={fields.department}
            onChange={(event) => updateField("department", event.target.value)}
          />
        </div>
      </div>
      {updateProfile.error && (
        <p role="alert" className="text-sm text-red-600">
          {updateProfile.error.message}
        </p>
      )}
      {updateProfile.data && (
        <p role="status" className="text-sm text-emerald-700">
          Perfil actualizado.
        </p>
      )}
      <Button type="submit" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
