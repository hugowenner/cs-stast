import { FileText } from "lucide-react";

export const metadata = {
  title: "Logs — CS2 Stats Hub Admin",
};

export default function AdminLogsPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-1">
          Logs do Sistema
        </h1>
        <p className="text-xs text-muted-foreground">
          Registro de auditoria, eventos do sistema e erros de processamento.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center p-12 border border-white/5 bg-white/[0.01] rounded-2xl min-h-[300px]">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 mb-4 text-muted-foreground">
          <FileText className="size-8" />
        </div>
        <h2 className="text-sm font-semibold text-foreground mb-1">Módulo em Desenvolvimento</h2>
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          A interface para filtrar registros de erros, auditar logins administrativos e acompanhar chamadas de APIs externas estará disponível na Fase 2.
        </p>
      </div>
    </div>
  );
}
