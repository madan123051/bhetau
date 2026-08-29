"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-sm items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-ivory shadow-xl">
      <WifiOff size={16} aria-hidden="true" /> You’re offline — we’ll retry.
    </div>
  );
}
