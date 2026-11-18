import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export const requireAdmin = cache(async () => {
  const session = await auth();
  if (!session?.user) {
    redirect("/user/signin");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    redirect("/");
  }
});
