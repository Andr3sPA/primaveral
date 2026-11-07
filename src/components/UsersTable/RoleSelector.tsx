import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Crown, Users, User } from "lucide-react";
import { Role } from "@prisma/client";

interface Props {
  user: { id: string; name: string | null; email: string; role: Role };
  onRoleChange: (userId: string, newRole: Role) => void;
}

export default function RoleSelector({ user, onRoleChange }: Props) {
  const getRoleIcon = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return Crown;
      case Role.EMPLOYEE:
        return Users;
      case Role.CLIENT:
        return User;
      default:
        return User;
    }
  };

  const getRoleVariant = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return "destructive" as const;
      case Role.EMPLOYEE:
        return "default" as const;
      case Role.CLIENT:
        return "secondary" as const;
      default:
        return "secondary" as const;
    }
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return "ADMIN";
      case Role.EMPLOYEE:
        return "EMPLOYEE";
      case Role.CLIENT:
        return "CLIENT";
      default:
        return role;
    }
  };

  const Icon = getRoleIcon(user.role);

  return (
    <Select
      value={user.role}
      onValueChange={(newRole: Role) => onRoleChange(user.id, newRole)}
    >
      <SelectTrigger className="w-auto border-none shadow-none">
        <Badge variant={getRoleVariant(user.role)} className="capitalize">
          <Icon className="mr-1 h-3 w-3" />
          {getRoleLabel(user.role)}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={Role.CLIENT}>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            CLIENT
          </div>
        </SelectItem>
        <SelectItem value={Role.EMPLOYEE}>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            EMPLOYEE
          </div>
        </SelectItem>
        <SelectItem value={Role.ADMIN}>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            ADMIN
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
