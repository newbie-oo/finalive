"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretUp, SignOut, User } from "@phosphor-icons/react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface AdminUserMenuProps {
  name: string;
  email: string;
  collapsed?: boolean;
}

export function AdminUserMenu({
  name,
  email,
  collapsed = false,
}: AdminUserMenuProps) {
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="User menu"
        className={cn(
          "group/admin-user-menu flex w-full cursor-pointer items-center gap-2.5 rounded-nav px-2 py-2 text-left transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          collapsed && "justify-center px-0",
        )}
      >
        <AvatarInitials name={name} size="sm" />
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-uism font-semibold text-foreground">
                {name}
              </div>
              <div className="truncate text-caption text-muted-foreground">
                {email}
              </div>
            </div>
            <CaretUp
              size={14}
              weight="bold"
              className="shrink-0 text-foreground-subtle transition-transform group-data-[state=open]/admin-user-menu:rotate-180"
            />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={collapsed ? "right" : "top"}
        align={collapsed ? "end" : "start"}
        sideOffset={collapsed ? 8 : 8}
        className="w-56"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-uism font-semibold text-foreground">
            {name}
          </span>
          <span className="truncate text-caption text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User size={16} weight="bold" />
            บัญชีของฉัน
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
          <SignOut size={16} weight="bold" />
          ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
