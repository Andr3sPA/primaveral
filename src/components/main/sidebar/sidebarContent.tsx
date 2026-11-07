import { auth } from "@/server/auth";
import Logged from "../logged";
import SidebarInfo from "./sidebarInfo";
import SidebarLinks from "./sidebarLinks";

export default async function SidebarContent() {
  const session = await auth();

  return (
    <>
      <SidebarInfo />
      {session ? <Logged /> : null}
      <SidebarLinks />
    </>
  );
}
