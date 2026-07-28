import { Breadcrumb } from "./Breadcrumb";
import { Server, Wifi } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-white/5 bg-black/[0.2] px-6 backdrop-blur-md">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center">
        <Breadcrumb />
      </div>

      {/* Right: Server Status */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-status-good/20 bg-status-good/5 px-2.5 py-0.5 text-[10px] font-semibold text-status-good">
          <Wifi className="size-3" />
          <span>Servidor Conectado</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <Server className="size-3" />
          <span>Produção</span>
        </div>
      </div>
    </header>
  );
}
