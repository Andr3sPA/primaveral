import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ReturnButtonProps {
  href?: string;
  onClick?: () => void;
}

export default function ReturnButton({
  href = "/",
  onClick,
}: ReturnButtonProps) {
  if (onClick) {
    return (
      <Button variant="outline" size="icon" onClick={onClick}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button variant="outline" size="icon" asChild>
      <Link href={href}>
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  );
}
