import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = {
  title: "Login — CS2 Stats Hub Admin",
  description: "Área administrativa restrita do CS2 Stats Hub.",
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows for premium look */}
      <div className="absolute top-1/4 left-1/4 size-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 size-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="z-10 flex flex-col items-center gap-8 w-full">
        {/* Branding header */}
        <div className="text-center flex flex-col items-center gap-1.5 select-none">
          <div className="bg-primary/10 border border-primary/20 size-12 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-primary/5">
            <span className="text-primary font-black text-xl">CS</span>
          </div>
          <h1 className="text-gradient text-3xl font-black tracking-tight">
            CS2 Stats Hub Admin
          </h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            Acesso Restrito ao Sistema
          </p>
        </div>

        {/* LoginForm Card */}
        <LoginForm />

        {/* Footer info */}
        <div className="text-[10px] text-muted-foreground/60 select-none">
          CS2 Stats Hub &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
