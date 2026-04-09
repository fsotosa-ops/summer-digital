/**
 * Barra de progreso mini reutilizable.
 * Recibe un porcentaje entero (0-100) y aplica color según el rango.
 */
export function MiniProgress({ pct }: { pct: number }) {
  const color = pct >= 60 ? 'bg-summer-teal' : pct >= 30 ? 'bg-summer-yellow' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 tabular-nums">{pct}%</span>
    </div>
  );
}
