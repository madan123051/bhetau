import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "default" | "sm" | "icon";
};

export function Button({ className, variant = "primary", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        variant === "primary" && "bg-gradient-to-br from-[#ff5a72] to-[#d72c55] text-white shadow-[0_12px_28px_rgba(216,44,85,.24)] hover:brightness-105",
        variant === "secondary" && "border bg-surface text-foreground hover:bg-raised",
        variant === "ghost" && "text-foreground hover:bg-black/5 dark:hover:bg-white/5",
        variant === "danger" && "bg-[#fff0f2] text-wine dark:bg-[#32141d] dark:text-[#ff9aac]",
        size === "default" && "h-14 px-6",
        size === "sm" && "h-11 px-4 text-sm",
        size === "icon" && "size-12 rounded-full p-0",
        className,
      )}
      {...props}
    />
  );
}
