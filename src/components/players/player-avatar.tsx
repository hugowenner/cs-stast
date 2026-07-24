"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export function PlayerAvatar({
  nickname,
  avatarUrl,
  size = "md",
}: {
  nickname: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [loaded, setLoaded] = useState(false);

  const dimension =
    size === "sm" ? "size-7 text-xs" : size === "lg" ? "size-14 text-lg" : "size-9 text-sm";

  const initials = nickname
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatares vêm de origem externa (Steam/GC), fora do domínio configurado para next/image
      <img
        src={avatarUrl}
        alt={nickname}
        className={cn(
          "rounded-full object-cover avatar-enter",
          loaded && "avatar-loaded",
          dimension,
        )}
        onLoad={() => setLoaded(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "from-accent-violet to-accent-cyan flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white",
        dimension,
      )}
    >
      {initials}
    </div>
  );
}
