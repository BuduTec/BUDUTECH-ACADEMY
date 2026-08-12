import { useEffect, useMemo, useState } from "react";

function partsUntil(target: Date) {
  const delta = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(delta / 86_400_000),
    hours: Math.floor((delta % 86_400_000) / 3_600_000),
    minutes: Math.floor((delta % 3_600_000) / 60_000),
    seconds: Math.floor((delta % 60_000) / 1_000),
  };
}

export default function Countdown({ startDate, compact = false }: { startDate: Date | string; compact?: boolean }) {
  const target = useMemo(() => new Date(startDate), [startDate]);
  const [parts, setParts] = useState(() => partsUntil(target));
  useEffect(() => {
    const timer = window.setInterval(() => setParts(partsUntil(target)), 1000);
    return () => window.clearInterval(timer);
  }, [target]);
  return <div className={`grid grid-cols-4 ${compact ? "gap-1.5" : "gap-2 sm:gap-3"}`} aria-label="Time remaining">
    {Object.entries(parts).map(([label, value]) => <div key={label} className={`rounded-xl border border-white/15 bg-white/10 text-center backdrop-blur ${compact ? "px-1 py-2" : "px-2 py-3"}`}><div className={`${compact ? "text-base" : "text-xl sm:text-2xl"} font-mono-brand font-medium tabular-nums text-[#e9f5d0]`}>{String(value).padStart(2, "0")}</div><div className="mt-0.5 text-[0.6rem] font-medium uppercase tracking-[0.16em] text-white/55">{label.slice(0, 3)}</div></div>)}
  </div>;
}
