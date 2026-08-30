import Image from "next/image";
import type { PortraitQuadrant } from "@/types/domain";
import { cn } from "@/lib/utils";

const positions: Record<PortraitQuadrant, { left: string; top: string }> = {
  tl: { left: "0", top: "0" },
  tr: { left: "-100%", top: "0" },
  bl: { left: "0", top: "-100%" },
  br: { left: "-100%", top: "-100%" },
};

const blur = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0MCcgaGVpZ2h0PSc1MCc+PHJlY3Qgd2lkdGg9JzQwJyBoZWlnaHQ9JzUwJyBmaWxsPScjZWRkOGQyJy8+PC9zdmc+";

export function Portrait({ quadrant, initials, alt, className, priority = false }: { quadrant?: PortraitQuadrant; initials?: string; alt: string; className?: string; priority?: boolean }) {
  if (!quadrant) {
    return <div role="img" aria-label={alt} className={cn("grid place-items-center bg-[linear-gradient(135deg,#7b2037,#e83c5b_55%,#f1b7a7)] text-5xl font-semibold text-white", className)}>{initials?.slice(0, 1).toUpperCase() ?? "?"}</div>;
  }
  const position = positions[quadrant];
  return (
    <div className={cn("relative overflow-hidden bg-[#eadbd5]", className)}>
      <div className="absolute h-[200%] w-[200%]" style={{ left: position.left, top: position.top }}>
        <Image
          src="/images/fictional-portraits.png"
          alt={alt}
          fill
          priority={priority}
          placeholder="blur"
          blurDataURL={blur}
          sizes="(max-width: 768px) 200vw, 860px"
          className="object-cover"
        />
      </div>
    </div>
  );
}
