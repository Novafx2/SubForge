interface AdPlaceholderProps {
  format?: 'horizontal' | 'rectangle';
  className?: string;
}

export function AdPlaceholder({ format = 'horizontal', className = '' }: AdPlaceholderProps) {
  return (
    <aside
      aria-label="Advertisement"
      className={`my-8 flex flex-col items-center justify-center p-3 rounded-lg border border-slate-800/80 bg-[#0d1424]/60 text-center ${className}`}
    >
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono mb-2">
        Advertisement
      </span>
      {format === 'horizontal' ? (
        <div className="w-full max-w-[728px] h-[90px] border border-dashed border-slate-700/60 rounded flex items-center justify-center text-xs text-slate-500 bg-slate-900/30">
          <span>Responsive Display Ad (728 × 90 Leaderboard)</span>
        </div>
      ) : (
        <div className="w-[300px] h-[250px] border border-dashed border-slate-700/60 rounded flex items-center justify-center text-xs text-slate-500 bg-slate-900/30">
          <span>Responsive Display Ad (300 × 250 Rectangle)</span>
        </div>
      )}
    </aside>
  );
}
