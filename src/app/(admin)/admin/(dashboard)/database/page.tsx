import { Database } from "lucide-react";

export const metadata = {
  title: "Banco de Dados — CS2 Stats Hub Admin",
};

export default function AdminDatabasePage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-1">
          Banco de Dados
        </h1>
        <p className="text-xs text-muted-foreground">
          Gerenciamento do banco de dados relacional e backups.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center p-12 border border-white/5 bg-white/[0.01] rounded-2xl min-h-[300px]">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 mb-4 text-muted-foreground">
          <Database className="size-8" />
        </div>
        <h2 className="text-sm font-semibold text-foreground mb-1">Módulo em Desenvolvimento</h2>
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          A interface para limpar tabelas temporárias, inspecionar tamanho de dados, realizar backups manuais e testar conexões estará disponível na Fase 2.
        </p>
      </div>
    </div>
  );
}
