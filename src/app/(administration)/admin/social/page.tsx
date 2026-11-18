import { SocialPublications } from "@/components/admin/social-publications";

export default function SocialPublishingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
      <header>
        <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">
          Administración
        </p>
        <h1 className="mt-2 text-3xl font-medium text-stone-900">
          Publicación social
        </h1>
      </header>
      <SocialPublications />
    </main>
  );
}
