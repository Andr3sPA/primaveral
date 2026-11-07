import SidebarContent from "./sidebarContent";
import SidebarMobile from "./sidebarMobile";

export default function Sidebar() {
  return (
    <>
      <aside className="hidden w-40 shrink-0 items-center gap-y-3 overflow-y-auto bg-white px-1 py-5 text-center text-black lg:flex lg:flex-col">
        <SidebarContent />
      </aside>
      <div className="lg:hidden">
        <SidebarMobile />
      </div>
    </>
  );
}
