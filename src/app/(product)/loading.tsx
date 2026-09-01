export default function ProductLoading() {
  return (
    <main className="min-h-[calc(100dvh-var(--product-nav-height))] animate-pulse px-5 pb-6 pt-[max(28px,env(safe-area-inset-top))]" aria-label="Loading Bhetau section">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-full bg-foreground/8" />
          <div className="h-8 w-36 rounded-xl bg-foreground/10" />
        </div>
        <div className="size-11 rounded-full bg-foreground/8" />
      </div>
      <div className="mt-8 space-y-3">
        <div className="h-20 rounded-[24px] bg-foreground/8" />
        <div className="h-20 rounded-[24px] bg-foreground/7" />
        <div className="h-20 rounded-[24px] bg-foreground/6" />
      </div>
      <span className="sr-only">Loading Bhetau</span>
    </main>
  );
}
