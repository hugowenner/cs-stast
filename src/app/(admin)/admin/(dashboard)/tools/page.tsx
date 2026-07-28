import { Wrench } from "lucide-react";

export const metadata = {
  title: "Ferramentas — CS2 Stats Hub Admin",
};

export default function AdminToolsPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-1">
          Ferramentas
        </h1>
        <p className="text-xs text-muted-foreground">
          Utilitários e ferramentas internas para depuração e testes.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center p-12 border border-white/5 bg-white/[0.01] rounded-2xl min-h-[300px]">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 mb-4 text-muted-foreground">
          <Wrench className="size-8" />
        </div>
        <h2 className="text-sm font-semibold text-foreground mb-1">Módulo em Desenvolvimento</h2>
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          A interface de ferramentas para testar o prompt do Coach IA, enviar mensagens de notificação e forçar revalidações de cache estará disponível na Fase 2.
        </p>
      </div>
    </div>
  );
}
