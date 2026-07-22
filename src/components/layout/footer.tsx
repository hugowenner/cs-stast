export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="glass-panel border border-white/10 bg-white/[0.02] rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
      <div className="min-w-0">
        <p className="text-xs font-bold text-white tracking-wide">CS2 Stats Hub</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
          Plataforma de análise competitiva para partidas de CS2
        </p>
      </div>
      <div className="text-[11px] text-muted-foreground flex flex-col items-center sm:items-end gap-0.5">
        <p>© {year} CS2 Stats Hub</p>
        <p className="font-semibold text-white/60">Criado por <span className="text-primary font-bold">LorD</span></p>
      </div>
    </footer>
  );
}
