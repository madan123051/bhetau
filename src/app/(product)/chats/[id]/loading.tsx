export default function ChatLoading() {
  return <main className="flex h-[calc(100dvh-84px)] min-h-0 animate-pulse flex-col overflow-hidden md:h-[736px]" aria-label="Loading conversation">
    <div className="flex min-h-[76px] items-center gap-3 border-b px-4 pt-[max(8px,env(safe-area-inset-top))]">
      <div className="size-11 rounded-full bg-foreground/8"/>
      <div className="size-11 rounded-full bg-foreground/8"/>
      <div className="flex-1 space-y-2"><div className="h-4 w-28 rounded bg-foreground/8"/><div className="h-3 w-40 rounded bg-foreground/6"/></div>
      <div className="size-11 rounded-full bg-foreground/8"/>
    </div>
    <div className="border-b px-4 py-4"><div className="h-3 w-24 rounded bg-foreground/8"/><div className="mt-3 h-3 w-4/5 rounded bg-foreground/6"/></div>
    <div className="flex-1 space-y-5 px-4 py-8">
      <div className="h-16 w-3/5 rounded-[20px] rounded-bl-md bg-foreground/6"/>
      <div className="ml-auto h-16 w-2/3 rounded-[20px] rounded-br-md bg-foreground/10"/>
      <div className="h-20 w-4/5 rounded-[20px] rounded-bl-md bg-foreground/6"/>
    </div>
    <div className="border-t p-4"><div className="h-14 rounded-[20px] bg-foreground/8"/></div>
  </main>;
}
