import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MenuIcon } from "lucide-react";
import SidebarContent from "./sidebarContent";

// Componente para mostrar la barra lateral en dispositivos móviles
export default function SidebarMobile() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <MenuIcon className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto p-5">
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );
}
