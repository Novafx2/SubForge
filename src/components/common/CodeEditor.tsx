import { useState } from 'react';
import { Copy, Check, Download, Search, FileCode } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  filename: string;
  formatName: string;
  cueCount?: number;
  readOnly?: boolean;
  onValueChange?: (val: string) => void;
  mimeType?: string;
}

export function CodeEditor({
  value,
  filename,
  formatName,
  cueCount,
  readOnly = true,
  onValueChange,
  mimeType = 'text/plain;charset=utf-8',
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([value], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lines = value ? value.split('\n') : [];
  const filteredLines = searchTerm
    ? lines.filter((l) => l.toLowerCase().includes(searchTerm.toLowerCase()))
    : lines;

  return (
    <div className="fintech-panel rounded-2xl shadow-xl flex flex-col h-full w-full max-w-full overflow-hidden">
      {/* Editor Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 bg-purple-950/25 border-b border-purple-500/20 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium min-w-0">
            <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="font-mono text-xs truncate max-w-[130px] sm:max-w-[200px]">{filename}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span>{formatName}</span>
            {cueCount !== undefined && (
              <>
                <span>·</span>
                <span className="font-mono tabular-nums">{cueCount} cues</span>
              </>
            )}
            <span>·</span>
            <span className="font-mono tabular-nums">{lines.length} lines</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              aria-label="Search subtitle text"
              className="bg-[#080d1a] border border-slate-700/80 rounded-md pl-8 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
            />
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full fintech-btn-secondary text-xs text-slate-200 hover:text-white transition-all disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!value}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full glass-pill-btn text-white text-xs font-semibold transition-all disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 min-h-[360px] max-h-[540px] overflow-auto bg-[#080d1a] p-4 text-xs font-mono text-slate-300 leading-relaxed">
        {value ? (
          searchTerm ? (
            <div className="space-y-1">
              <div className="text-[11px] text-amber-400 mb-2">
                Showing matching lines ({filteredLines.length}):
              </div>
              {filteredLines.map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap py-0.5">
                  {line}
                </div>
              ))}
            </div>
          ) : readOnly ? (
            <pre className="whitespace-pre-wrap">{value}</pre>
          ) : (
            <textarea
              value={value}
              onChange={(e) => onValueChange?.(e.target.value)}
              aria-label="Editable subtitle text"
              className="w-full h-full bg-transparent resize-none border-none outline-none font-mono text-xs text-slate-200 leading-relaxed"
            />
          )
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-center p-8">
            <p>Upload a file or paste subtitle text above to see output preview.</p>
          </div>
        )}
      </div>
    </div>
  );
}
