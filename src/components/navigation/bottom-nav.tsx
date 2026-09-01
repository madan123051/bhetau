"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, MessageCircle, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/likes", label: "Likes", icon: Heart },
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/you", label: "You", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 mx-auto h-[var(--product-nav-height)] max-w-[430px] border-t bg-[color:var(--surface)]/92 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:absolute">
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href === "/chats" && pathname.startsWith("/chats/"));
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium text-stone transition", active && "text-crimson")}>
                <span className={cn("grid size-8 place-items-center rounded-full", active && "bg-crimson/10")}><Icon size={19} strokeWidth={active ? 2.5 : 2} aria-hidden="true" /></span>
                {label}
                <PendingIndicator />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function PendingIndicator() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={cn("absolute right-2 top-1 size-1.5 rounded-full bg-crimson transition-opacity", pending ? "opacity-100" : "opacity-0")} />;
}
