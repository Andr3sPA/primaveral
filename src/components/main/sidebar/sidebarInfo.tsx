import { auth } from "@/server/auth";
import { CircleUserRound } from "lucide-react";

export default async function SidebarInfo() {
  const session = await auth();

  return (
    <div className="flex flex-col items-center gap-y-2">
      <CircleUserRound size={35} />
      <h1 className="text-lg font-semibold">{session?.user.name}</h1>
      {session?.user.role}
    </div>
  );
}
