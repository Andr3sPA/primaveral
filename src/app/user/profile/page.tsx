import { ProfileForm } from "@/components/account-forms";

export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-semibold">Mi perfil</h1>
      <ProfileForm />
    </main>
  );
}
