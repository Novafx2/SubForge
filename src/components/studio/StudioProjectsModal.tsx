import { FolderOpen, Trash2, X, FileJson, Plus, Clock, Film } from 'lucide-react';
import { SavedProjectSummary } from '../../types/videoStudio';
import { formatStudioTimecode } from './StudioPreviewPlayer';

interface StudioProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: SavedProjectSummary[];
  currentProjectId: string;
  onLoadProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onNewProject: () => void;
  onExportJson: () => void;
}

export function StudioProjectsModal({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  onLoadProject,
  onDeleteProject,
  onNewProject,
  onExportJson,
}: StudioProjectsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#0a1020] border border-blue-500/30 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Saved Studio Projects (IndexedDB)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close projects modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onNewProject();
                onClose();
              }}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New Blank Project
            </button>
            <button
              type="button"
              onClick={onExportJson}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-blue-500/50 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <FileJson className="w-3.5 h-3.5 text-cyan-400" />
              Download Project JSON
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
              No saved projects yet. Click <span className="text-blue-400 font-semibold">Save</span> in the toolbar to store your project and uploaded media locally in your browser.
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    p.id === currentProjectId
                      ? 'bg-blue-950/35 border-blue-500/45'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate flex items-center gap-2">
                      <span>{p.name}</span>
                      {p.id === currentProjectId && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-300 text-[10px]">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Film className="w-3 h-3 text-blue-400" />
                        {p.clipCount} clips
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        {formatStudioTimecode(p.durationMs)}
                      </span>
                      <span>{p.aspectRatio}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onLoadProject(p.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProject(p.id)}
                      aria-label={`Delete ${p.name}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
