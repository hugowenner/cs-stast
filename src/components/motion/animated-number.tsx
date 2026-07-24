"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

export function AnimatedNumber({
  value,
  duration = 0.85,
  decimals = 0,
  suffix = "",
  locale = "pt-BR",
}: {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  locale?: string;
}) {
  const prefersReduced = useReducedMotion();
  // Sempre inicia em 0 para que SSR e hidratação coincidam.
  // useEffect ajusta o valor (instantâneo ou animado) após montar no cliente.
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(decimals > 0 ? v : Math.round(v)),
    });
    return () => controls.stop();
  }, [value, duration, decimals, prefersReduced]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : display.toLocaleString(locale);

  return <>{formatted}{suffix}</>;
}
