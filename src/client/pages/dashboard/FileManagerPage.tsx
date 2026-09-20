import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderOpen,
  File,
  Upload,
  ChevronLeft,
  Trash2,
  Download,
  Search,
  FolderPlus,
  RefreshCw,
  Edit3,
  X,
  Save,
  Loader2,
  AlertCircle,
  HardDrive,
  FileText,
  ChevronRight,
} from 'lucide-react';
import api from '../../lib/api';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const FileManagerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [storageUsed, setStorageUsed] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showMkdir, setShowMkdir] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [mkdirLoading, setMkdirLoading] = useState(false);

  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchFiles = useCallback(async (path?: string) => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const targetPath = path || '';
      const endpoint = targetPath
        ? `/files/${id}/browse/${encodeURIComponent(targetPath)}`
        : `/files/${id}`;
      const data = await api.get(endpoint);
      setFiles(data.files || []);
      setStorageUsed(data.storageUsed || 0);
      setCurrentPath(data.currentPath || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleSearch = async () => {
    if (!id || !searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const data = await api.get(`/files/${id}/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, id]);

  const navigateToFolder = (path: string) => {
    setSearchQuery('');
    setIsSearching(false);
    fetchFiles(path);
  };

  const navigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    navigateToFolder(parts.join('/'));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !id) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('path', currentPath);
      for (let i = 0; i < fileList.length; i++) {
        formData.append('files', fileList[i]);
      }
      const res = await fetch(`/api/files/${id}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      await fetchFiles(currentPath);
      setShowUpload(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMkdir = async () => {
    if (!id || !newFolderName.trim()) return;
    setMkdirLoading(true);
    try {
      await api.post(`/files/${id}/mkdir`, {
        name: newFolderName.trim(),
        parentPath: currentPath,
      });
      setNewFolderName('');
      setShowMkdir(false);
      await fetchFiles(currentPath);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setMkdirLoading(false);
    }
  };

  const handleDelete = async (filePath: string) => {
    if (!id) return;
    if (!confirm(`Are you sure you want to delete "${filePath.split('/').pop()}"?`)) return;
    const res = await fetch(`/api/files/${id}/delete`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to delete');
      return;
    }
    await fetchFiles(currentPath);
  };

  const startRename = (file: FileEntry) => {
    setRenaming(file.path);
    setRenameValue(file.name);
  };

  const handleRename = async () => {
    if (!id || !renaming || !renameValue.trim()) return;
    setRenameLoading(true);
    try {
      await api.put(`/files/${id}/rename`, {
        oldPath: renaming,
        newName: renameValue.trim(),
      });
      setRenaming(null);
      await fetchFiles(currentPath);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to rename');
    } finally {
      setRenameLoading(false);
    }
  };

  const startEdit = async (file: FileEntry) => {
    if (!id) return;
    setEditing(file.path);
    setEditLoading(true);
    try {
      const data = await api.get(`/files/${id}/read/${encodeURIComponent(file.path)}`);
      setEditContent(data.content || '');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to read file');
      setEditing(null);
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveFile = async () => {
    if (!id || !editing) return;
    setEditLoading(true);
    try {
      await api.put(`/files/${id}/write/${encodeURIComponent(editing)}`, {
        content: editContent,
      });
      setEditing(null);
      await fetchFiles(currentPath);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDownload = (filePath: string) => {
    if (!id) return;
    window.open(`/api/files/${id}/download/${encodeURIComponent(filePath)}`, '_blank');
  };

  const isTextFile = (name: string): boolean => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return [
      'js', 'ts', 'tsx', 'jsx', 'json', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h',
      'html', 'css', 'scss', 'less', 'md', 'txt', 'yml', 'yaml', 'toml', 'ini', 'env',
      'sh', 'bash', 'zsh', 'sql', 'xml', 'csv', 'log',
    ].includes(ext);
  };

  const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : [];

  const displayFiles = isSearching ? searchResults : files;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to={`/bots/${id}`}
          className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">File Manager</h1>
          <p className="mt-1 text-gray-400">Manage your bot's files.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchFiles(currentPath)}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowMkdir(true)}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-gray-500" />
          <span className="text-xs text-gray-400">
            Storage: {formatSize(storageUsed)}
          </span>
        </div>
        {storageUsed > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${Math.min((storageUsed / (500 * 1024 * 1024)) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {!isSearching && (
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <button
            onClick={() => navigateToFolder('')}
            className="rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-white"
          >
            /
          </button>
          {pathParts.map((part, i) => (
            <React.Fragment key={i}>
              <ChevronRight className="h-3 w-3" />
              <button
                onClick={() => navigateToFolder(pathParts.slice(0, i + 1).join('/'))}
                className="rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-white"
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <p className="mt-3 text-sm text-gray-400">Loading files...</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!loading && !error && displayFiles.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-white">
            {isSearching ? 'No results found' : 'Empty folder'}
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            {isSearching ? 'Try a different search term.' : 'Upload files to get started.'}
          </p>
        </div>
      )}

      {!loading && !error && displayFiles.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="border-b border-white/10 px-4 py-2.5 text-xs font-medium text-gray-500">
            <div className="grid grid-cols-[1fr_100px_160px_120px] gap-2">
              <span>Name</span>
              <span>Size</span>
              <span>Modified</span>
              <span className="text-right">Actions</span>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {!isSearching && currentPath && (
              <button
                onClick={navigateUp}
                className="flex w-full items-center px-4 py-2.5 text-left text-sm text-gray-400 hover:bg-white/5"
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                ..
              </button>
            )}
            {displayFiles.map((file) => (
              <div
                key={file.path}
                className="group flex items-center px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
              >
                <div className="flex flex-1 items-center gap-2 overflow-hidden">
                  {file.isDirectory ? (
                    <FolderOpen className="h-4 w-4 shrink-0 text-yellow-400" />
                  ) : isTextFile(file.name) ? (
                    <FileText className="h-4 w-4 shrink-0 text-blue-400" />
                  ) : (
                    <File className="h-4 w-4 shrink-0 text-gray-500" />
                  )}
                  {renaming === file.path ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                        className="rounded border border-white/10 bg-white/5 px-2 py-1 text-white focus:border-indigo-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleRename}
                        disabled={renameLoading}
                        className="text-green-400 hover:text-green-300"
                      >
                        <Save className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setRenaming(null)}
                        className="text-gray-500 hover:text-gray-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : file.isDirectory ? (
                    <button
                      onClick={() => navigateToFolder(file.path)}
                      className="truncate text-white hover:underline"
                    >
                      {file.name}
                    </button>
                  ) : (
                    <span className="truncate text-white">{file.name}</span>
                  )}
                </div>

                <div className="w-[100px] shrink-0 text-right text-xs text-gray-500">
                  {file.isDirectory ? '-' : formatSize(file.size)}
                </div>
                <div className="w-[160px] shrink-0 px-2 text-xs text-gray-500">
                  {formatDate(file.modifiedAt)}
                </div>
                <div className="flex w-[120px] shrink-0 items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.isDirectory ? (
                    <button
                      onClick={() => navigateToFolder(file.path)}
                      className="rounded p-1.5 text-gray-500 hover:bg-white/10 hover:text-white"
                      title="Open"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleDownload(file.path)}
                        className="rounded p-1.5 text-gray-500 hover:bg-white/10 hover:text-white"
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {isTextFile(file.name) && (
                        <button
                          onClick={() => startEdit(file)}
                          className="rounded p-1.5 text-gray-500 hover:bg-white/10 hover:text-white"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => startRename(file)}
                    className="rounded p-1.5 text-gray-500 hover:bg-white/10 hover:text-white"
                    title="Rename"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(file.path)}
                    className="rounded p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-gray-900 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Upload Files</h3>
              <button
                onClick={() => setShowUpload(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleUpload}
                className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500"
              />
            </div>
            {uploading && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </div>
            )}
          </div>
        </div>
      )}

      {showMkdir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-gray-900 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">New Folder</h3>
              <button
                onClick={() => setShowMkdir(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMkdir()}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Folder name"
                autoFocus
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowMkdir(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleMkdir}
                disabled={mkdirLoading || !newFolderName.trim()}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {mkdirLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-white/10 bg-gray-900 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white truncate">
                Editing: {editing}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveFile}
                  disabled={editLoading}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {editLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mt-4 flex-1 overflow-hidden">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="h-full w-full resize-none rounded-lg border border-white/10 bg-gray-950 p-4 font-mono text-sm text-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 scrollbar-thin"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManagerPage;
