import {
  Clapperboard,
  Undo2,
  Redo2,
  RotateCcw,
  Save,
  FolderOpen,
  Download,
  Monitor,
  Smartphone,
  Square,
  Sparkles,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { AspectRatioMode } from '../../types/videoStudio';

interface StudioTopBarProps {
  projectName: string;
  onRenameProject: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onSaveProject: () => void;
  onOpenProjectsModal: () => void;
  isSaving: boolean;
  lastSavedAt: string | null;
  aspectRatio: AspectRatioMode;
  onChangeAspectRatio: (ratio: AspectRatioMode) => void;
  aiOnline: boolean | null;
  onOpenExportTab: () => void;
  isExporting: boolean;
}

export function StudioTopBar({
  projectName,
  onRenameProject,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  onSaveProject,
  onOpenProjectsModal,
  isSaving,
  lastSavedAt,
  aspectRatio,
  onChangeAspectRatio,
  aiOnline,
  onOpenExportTab,
  isExporting,
}: StudioTopBarProps) {
  return (
    <div className="bg-[#070b16]/95 border-b border-blue-500/20 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
      {/* Left: Studio Terminal Title & Editable Project Name */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_16px_rgba(59,130,246,0.45)] shrink-0">
          <Clapperboard className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              SubForge Video Studio
            </span>
            {lastSavedAt && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Saved
              </span>
            )}
          </div>
          <input
            type="text"
            value={projectName}
            onChange={(e) => onRenameProject(e.target.value)}
            aria-label="Project title"
            className="bg-transparent text-xs sm:text-sm font-semibold text-white focus:outline-none focus:bg-slate-900/90 focus:ring-1 focus:ring-blue-500/50 rounded px-1 -ml-1 py-0.5 w-40 sm:w-56 truncate"
          />
        </div>
      </div>

      {/* Center: History Controls, Aspect Ratio Switcher, Project Persistence */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="px-2 py-1.5 rounded-md text-xs text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors flex items-center gap-1"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Undo</span>
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
            className="px-2 py-1.5 rounded-md text-xs text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none transition-colors flex items-center gap-1"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Redo</span>
          </button>
          <div className="w-px h-4 bg-slate-800 mx-0.5" />
          <button
            type="button"
            onClick={onReset}
            title="Reset timeline project"
            aria-label="Reset project"
            className="px-2 py-1.5 rounded-md text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Reset</span>
          </button>
        </div>

        {/* Aspect Ratio Switcher */}
        <div
          className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5"
          role="group"
          aria-label="Canvas aspect ratio"
        >
          {(
            [
              { id: '16:9', label: '16:9', icon: Monitor },
              { id: '9:16', label: '9:16', icon: Smartphone },
              { id: '1:1', label: '1:1', icon: Square },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = aspectRatio === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeAspectRatio(item.id)}
                className={`px-2 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.45)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Save & Projects Library */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSaveProject}
            disabled={isSaving}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-blue-500/50 text-xs font-medium text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Save className="w-3.5 h-3.5 text-blue-400" />}
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            type="button"
            onClick={onOpenProjectsModal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-blue-500/50 text-xs font-medium text-slate-200 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Projects</span>
          </button>
        </div>
      </div>

      {/* Right: External AI Status + Export Video Action */}
      <div className="flex items-center gap-2">
        <div
          title={
            aiOnline
              ? 'Server Gemini AI connected for neural subtitle translation'
              : 'External AI key unconfigured or offline — local browser tools still run 100% offline'
          }
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
            aiOnline
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              : 'bg-slate-900 border-slate-700 text-slate-400'
          }`}
        >
          {aiOnline ? <Sparkles className="w-3 h-3 text-cyan-400" /> : <WifiOff className="w-3 h-3 text-slate-500" />}
          <span>{aiOnline ? 'AI API Ready' : 'Local Engine'}</span>
        </div>

        <button
          type="button"
          onClick={onOpenExportTab}
          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-[0_0_18px_rgba(37,99,235,0.45)] transition-all flex items-center gap-1.5 cursor-pointer"
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          <span>{isExporting ? 'Rendering...' : 'Export Video'}</span>
        </button>
      </div>
    </div>
  );
}
