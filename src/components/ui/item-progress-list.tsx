export interface ItemProgress {
  name: string;
  count: number;
  percentage: number;
  subtitle?: string;
}

export function ItemProgressList({
  items,
  emptyMessage = "Nenhum registro encontrado.",
  barColor = "var(--series-1)",
}: {
  items: ItemProgress[];
  emptyMessage?: string;
  barColor?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.name} className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between font-medium">
            <span>{item.name}</span>
            <span className="tabular-nums">
              {item.percentage.toFixed(1)}%{" "}
              {item.subtitle && (
                <span className="text-muted-foreground text-xs font-normal">
                  ({item.subtitle})
                </span>
              )}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(Math.max(item.percentage, 0), 100)}%`,
                backgroundColor: barColor,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
