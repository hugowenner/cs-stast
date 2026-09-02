import { Breadcrumb } from "./Breadcrumb";
import { Server, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const isProd = process.env.NODE_ENV === "production";
  const envLabel = isProd ? "Production" : "Development";

  return (
    <header className="flex h-14 items-center justify-between border-b border-white/5 bg-black/[0.2] px-6 backdrop-blur-md">
      <div className="flex items-center">
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-status-good/20 bg-status-good/5 px-2.5 py-0.5 text-[10px] font-semibold text-status-good">
          <Wifi className="size-3" />
          <span>Connected</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold",
            isProd
              ? "border-rose-500/20 bg-rose-500/5 text-rose-400"
              : "border-sky-500/20 bg-sky-500/5 text-sky-400"
          )}
        >
          <Server className="size-3" />
          <span>{envLabel}</span>
        </div>
      </div>
    </header>
  );
}
