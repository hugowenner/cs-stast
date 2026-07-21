import { PlayerAvatar } from "@/components/players/player-avatar";

export interface RelationshipItem {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  count: number;
}

export function RelationshipList({
  items,
  emptyMessage = "Nenhum registro encontrado.",
  labelSuffix = "partidas juntas",
}: {
  items: RelationshipItem[];
  emptyMessage?: string;
  labelSuffix?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
        >
          <PlayerAvatar nickname={item.nickname} avatarUrl={item.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{item.nickname}</p>
            <p className="text-muted-foreground text-xs">
              {item.count} {labelSuffix}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
