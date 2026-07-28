"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Por favor, digite a senha.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        // Redireciona para o dashboard administrativo
        router.push("/admin/dashboard");
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || "Ocorreu um erro ao fazer login.");
      }
    } catch (err) {
      setError("Erro de rede. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-md p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="password"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Senha Administrativa
          </label>
          <div className="relative">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              placeholder="••••••••••••"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-white/5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-3 focus:ring-primary/20 transition-all"
              autoFocus
            />
            <KeyRound className="absolute left-3.5 top-3.5 size-4 text-muted-foreground/60" />
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium"
          >
            <ShieldAlert className="size-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/10 transition-all active:translate-y-px"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Autenticando...</span>
            </>
          ) : (
            <span>Entrar</span>
          )}
        </Button>
      </form>
    </motion.div>
  );
}
