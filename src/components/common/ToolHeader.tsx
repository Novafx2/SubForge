import { Breadcrumbs } from '../layout/Breadcrumbs';
import { ShieldCheck, Zap, Lock } from 'lucide-react';

interface ToolHeaderProps {
  title: string;
  tagline: string;
  categoryName: string;
  breadcrumbLabel: string;
  supportedFormats?: string;
}

export function ToolHeader({
  title,
  tagline,
  categoryName,
  breadcrumbLabel,
  supportedFormats = 'SRT, WebVTT',
}: ToolHeaderProps) {
  return (
    <div className="mb-8">
      <Breadcrumbs
        items={[
          { label: 'Tools', path: '/' },
          { label: breadcrumbLabel },
        ]}
      />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="max-w-3xl">
          {/* Unboxed Metadata (Zero-Pill Discipline) */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
            <span className="text-blue-400 uppercase tracking-wider">{categoryName}</span>
            <span aria-hidden="true">·</span>
            <span>Formats: {supportedFormats}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-400">100% Free &amp; Private</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-2">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl">
            {tagline}
          </p>
        </div>

        {/* Quiet Trust Markers */}
        <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Browser-Only</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
