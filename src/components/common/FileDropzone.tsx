import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, FileText, Clipboard, Sparkles } from 'lucide-react';

interface FileDropzoneProps {
  onContentLoaded: (content: string, filename: string) => void;
  acceptedFormats?: string[];
  sampleContent?: string;
  sampleFilename?: string;
  label?: string;
}

export function FileDropzone({
  onContentLoaded,
  acceptedFormats = ['.srt', '.vtt', '.txt'],
  sampleContent,
  sampleFilename = 'sample_subtitles.srt',
  label = 'Upload or paste your subtitle file',
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        onContentLoaded(text, file.name);
      }
    };
    reader.readAsText(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handlePasteSubmit = () => {
    if (pastedText.trim()) {
      setFileName('pasted_subtitles.srt');
      onContentLoaded(pastedText, 'pasted_subtitles.srt');
    }
  };

  const handleLoadSample = () => {
    if (sampleContent) {
      setFileName(sampleFilename);
      setPastedText(sampleContent);
      onContentLoaded(sampleContent, sampleFilename);
    }
  };

  return (
    <div className="fintech-panel rounded-2xl p-5 shadow-lg">
      {/* Tab Switcher & Load Sample */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-purple-500/15">
        <div className="flex items-center gap-1.5 p-1 bg-[#100920]/70 backdrop-blur-md rounded-full border border-purple-500/25">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
              activeTab === 'upload'
                ? 'glass-pill-btn text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
              activeTab === 'paste'
                ? 'glass-pill-btn text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste Text</span>
          </button>
        </div>

        {sampleContent && (
          <button
            type="button"
            onClick={handleLoadSample}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors px-2 py-1 rounded hover:bg-blue-950/40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo Sample</span>
          </button>
        )}
      </div>

      {activeTab === 'upload' ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-950/20'
              : 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={onInputChange}
            aria-label={label}
            className="hidden"
          />
          <div className="w-12 h-12 mx-auto rounded-full bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400 mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-200 mb-1">{label}</p>
          <p className="text-xs text-slate-400 mb-3">
            Drag and drop your file here, or click to browse
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <span>Supports {acceptedFormats.join(', ')}</span>
            <span>·</span>
            <span>Max 50MB</span>
            <span>·</span>
            <span>100% In-Browser</span>
          </div>

          {fileName && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-950/40 border border-blue-800/60 rounded-md text-xs text-blue-300 font-mono">
              <FileText className="w-3.5 h-3.5" />
              <span>Loaded: {fileName}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste your SRT or WebVTT raw subtitle content here (e.g. 1 \n 00:00:01,000 --> 00:00:04,000 \n Hello world!)..."
            rows={8}
            aria-label="Paste raw subtitle text"
            className="w-full bg-[#080d1a] border border-slate-700/80 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-y"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {pastedText.length} characters
            </span>
            <button
              type="button"
              onClick={handlePasteSubmit}
              disabled={!pastedText.trim()}
              className="px-5 py-2.5 text-xs font-semibold text-white glass-pill-btn rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Parse Pasted Text
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
