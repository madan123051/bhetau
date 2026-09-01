import { BottomNav } from "@/components/navigation/bottom-nav";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { MayaProvider } from "@/features/maya/maya-provider";
import { cn } from "@/lib/utils";

export function ProductShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh bg-[#efe9e6] dark:bg-black md:grid md:place-items-center md:p-6">
      <OfflineBanner />
      <div className={cn("relative min-h-dvh w-full overflow-hidden bg-background pb-[var(--product-nav-height)] [--product-nav-height:calc(72px+env(safe-area-inset-bottom))] md:min-h-[820px] md:max-w-[430px] md:rounded-[38px] md:border md:shadow-[0_40px_100px_rgba(41,18,26,.2)]", className)}>
        <MayaProvider initialEngine={process.env.GEMINI_API_KEY?.trim() ? "Google Gemini" : "Bhetau demo"}>
          {children}
          <BottomNav />
        </MayaProvider>
      </div>
    </div>
  );
}
