import { User } from "lucide-react";

interface Props {
  name: string | null;
  email: string;
}

export default function UserInfoCell({ name, email }: Props) {
  return (
    <div className="flex items-center gap-2">
      <User className="text-muted-foreground h-4 w-4" />
      <div>
        <div className="font-medium">
          {name ?? (
            <span className="text-muted-foreground italic">Sin nombre</span>
          )}
        </div>
        <div className="text-muted-foreground text-sm">{email}</div>
      </div>
    </div>
  );
}
