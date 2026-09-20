import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Download,
  Upload,
} from 'lucide-react';
import api from '../../lib/api';
import PageTransition from '../../components/PageTransition';

const FileEditorPage: React.FC = () => {
  const { id, '*': filePath } = useParams<{ id: string; '*': string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFile = useCallback(async () => {
    if (!id || !filePath) return;
    try {
      const data = await api.get(`/files/${id}/read/${filePath}`);
      setContent(data.content || '');
      setOriginalContent(data.content || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  }, [id, filePath]);

  useEffect(() => {
    fetchFile();
  }, [fetchFile]);

  const handleSave = async () => {
    if (!id || !filePath) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/files/${id}/write/${filePath}`, { content });
      setOriginalContent(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!id || !filePath) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() || 'file';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') {
        setContent(text);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const isModified = content !== originalContent;
  const fileName = filePath?.split('/').pop() || 'file';

  return (
    <PageTransition>
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 animate-slide-up">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-white transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-white">{filePath}</span>
              {isModified && <span className="h-2 w-2 rounded-full bg-yellow-400" />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-400 animate-fade-in">
                <CheckCircle className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept=".txt,.js,.ts,.json,.py,.css,.html,.yml,.yaml,.toml,.md,.env,.sh,.bat" />
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 transition-all">
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 transition-all">
              <Download className="h-3.5 w-3.5" /> Download
            </button>
            <button onClick={handleSave} disabled={saving || !isModified}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-gray-100 disabled:opacity-30 transition-all">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save (Ctrl+S)
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-2 flex items-center gap-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-400 animate-fade-in">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none bg-[#0a0a0a] p-4 font-mono text-sm text-gray-300 focus:outline-none scrollbar-thin"
            spellCheck={false}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default FileEditorPage;
