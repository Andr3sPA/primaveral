import Link from "next/link";
import { Button } from "../ui/button";

interface buttonLinkProps {
  href: string;
  children: React.ReactNode;
}

export default function buttonLink({ href, children }: buttonLinkProps) {
  return (
    <Button asChild>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
