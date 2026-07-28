"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
      });

      if (response.ok) {
        router.push("/admin");
        router.refresh();
      }
    } catch (err) {
      console.error("Erro ao efetuar logout:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-200 select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin shrink-0" />
      ) : (
        <LogOut className="size-4 shrink-0" />
      )}
      <span>Sair da Sessão</span>
    </button>
  );
}
