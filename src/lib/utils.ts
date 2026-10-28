import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanMapName(name: string): string {
  if (!name) return "";
  const stripped = name.replace(/^de_/i, "").trim();
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

