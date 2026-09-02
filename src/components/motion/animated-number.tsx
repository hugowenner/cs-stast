"use client";

import { useEffect, useRef, useState } from "react";
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
  const [display, setDisplay] = useState(0);
  // Tracks the last rendered value so updates animate from current → new, not 0 → new
  const displayRef = useRef(0);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      displayRef.current = value;
      return;
    }

    const from = isFirstMount.current ? 0 : displayRef.current;
    isFirstMount.current = false;

    const controls = animate(from, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        const rounded = decimals > 0 ? v : Math.round(v);
        displayRef.current = rounded;
        setDisplay(rounded);
      },
    });
    return () => controls.stop();
  }, [value, duration, decimals, prefersReduced]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : display.toLocaleString(locale);

  return <>{formatted}{suffix}</>;
}
