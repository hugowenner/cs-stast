import { Users2, Map, Swords, Flame, Trophy } from "lucide-react";

interface PlatformDataProps {
  totalPlayers: number;
  activeTracked: number;
  totalMatches: number;
  totalMaps: number;
  totalRounds: number;
  totalKills: number;
}

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
}

function StatItem({ icon: Icon, label, value, sub }: StatItemProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.03] transition-colors">
      <Icon className="size-4 text-muted-foreground" />
      <div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
          {label}
        </span>
        <span className="text-xl font-black text-foreground">{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground block mt-0.5">{sub}</span>}
      </div>
    </div>
  );
}

export function PlatformData({
  totalPlayers,
  activeTracked,
  totalMatches,
  totalMaps,
  totalRounds,
  totalKills,
}: PlatformDataProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5 shadow-lg">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Platform Data
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatItem
          icon={Users2}
          label="Players"
          value={totalPlayers}
          sub={`${activeTracked} tracked`}
        />
        <StatItem icon={Trophy} label="Matches" value={totalMatches} />
        <StatItem icon={Map} label="Maps" value={totalMaps} />
        <StatItem icon={Swords} label="Rounds" value={totalRounds} />
        <StatItem icon={Flame} label="Kills" value={totalKills} />
      </div>
    </div>
  );
}
