import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block size-9", className)} aria-hidden="true">
      <span className="absolute left-0 top-0 h-6 w-7 rounded-[10px_10px_10px_3px] bg-gradient-to-br from-[#ff5a72] to-[#d72c55]" />
      <span className="absolute bottom-0 right-0 h-6 w-7 rounded-[10px_3px_10px_10px] border-[3px] border-wine bg-[var(--ivory)] dark:border-[#ff7188]" />
    </span>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="bhetau">
      <BrandMark className={compact ? "scale-90" : undefined} />
      <span className={cn("font-semibold tracking-[-0.05em]", compact ? "text-xl" : "text-2xl")}>bhetau</span>
    </span>
  );
}
