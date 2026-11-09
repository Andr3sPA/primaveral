import { GuestOrderTracking } from "@/components/GuestOrderTracking";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function GuestOrderTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;

  return <GuestOrderTracking token={typeof token === "string" ? token : ""} />;
}
