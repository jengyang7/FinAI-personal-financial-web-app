'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, AlertCircle, CheckCircle, Loader2, RefreshCw, Download, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Document {
    id: string;
    name: string;
    file_path: string;
    file_size: number;
    page_count: number;
    status: 'processing' | 'ready' | 'error';
    error_message?: string;
    created_at: string;
    chunk_count?: number;
}

export default function Documents() {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>('');
    const [dragActive, setDragActive] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; doc: Document | null }>({ show: false, doc: null });
    const [downloading, setDownloading] = useState<string | null>(null);
    const [renameModal, setRenameModal] = useState<{ show: boolean; doc: Document | null }>({ show: false, doc: null });
    const [renameValue, setRenameValue] = useState('');
    const [renaming, setRenaming] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadDocuments = async (isRefresh = false) => {
        if (!user) return;

        if (isRefresh) {
            setRefreshing(true);
        }

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const response = await fetch('/api/documents/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setDocuments(data.documents || []);
            }
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadDocuments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Poll for processing documents
    useEffect(() => {
        const processingDocs = documents.filter(d => d.status === 'processing');
        if (processingDocs.length === 0) return;

        const interval = setInterval(() => {
            loadDocuments();
        }, 3000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documents]);

    const handleUpload = async (file: File) => {
        if (!user || !file) return;

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            alert('Only PDF files are supported');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File too large. Maximum size is 10MB');
            return;
        }

        setUploading(true);
        setUploadProgress('Uploading...');

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', file.name.replace('.pdf', ''));

            const response = await fetch('/api/documents/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                setUploadProgress('Processing document...');
                await loadDocuments();
            } else {
                const error = await response.json();
                alert(error.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed');
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.doc) return;

        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const response = await fetch('/api/documents/delete', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ documentId: deleteModal.doc.id })
            });

            if (response.ok) {
                setDocuments(prev => prev.filter(d => d.id !== deleteModal.doc?.id));
            } else {
                const error = await response.json();
                alert(error.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Delete failed');
        } finally {
            setDeleteModal({ show: false, doc: null });
        }
    };

    const handleDownload = async (doc: Document) => {
        if (downloading) return;

        setDownloading(doc.id);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const response = await fetch('/api/documents/download', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ documentId: doc.id })
            });

            if (response.ok) {
                const { url, filename } = await response.json();
                // Trigger download by creating a temporary link
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                const error = await response.json();
                alert(error.error || 'Download failed');
            }
        } catch (error) {
            console.error('Download error:', error);
            alert('Download failed');
        } finally {
            setDownloading(null);
        }
    };

    const openRenameModal = (doc: Document) => {
        setRenameModal({ show: true, doc });
        setRenameValue(doc.name);
    };

    const handleRename = async () => {
        if (!renameModal.doc || !renameValue.trim()) return;

        setRenaming(true);
        try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const response = await fetch('/api/documents/rename', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    documentId: renameModal.doc.id,
                    name: renameValue.trim()
                })
            });

            if (response.ok) {
                setDocuments(prev => prev.map(d =>
                    d.id === renameModal.doc?.id ? { ...d, name: renameValue.trim() } : d
                ));
                setRenameModal({ show: false, doc: null });
            } else {
                const error = await response.json();
                alert(error.error || 'Rename failed');
            }
        } catch (error) {
            console.error('Rename error:', error);
            alert('Rename failed');
        } finally {
            setRenaming(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="p-6 bg-[var(--background)] min-h-screen transition-colors duration-300 flex items-center justify-center">
                <div className="text-center animate-scale-in">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="relative spinner rounded-full h-16 w-16 border-4 border-[var(--text-tertiary)] border-t-transparent"></div>
                    </div>
                    <p className="text-[var(--text-secondary)] font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-[var(--background)] min-h-screen transition-colors duration-300">
            {/* Delete Confirmation Modal */}
            {deleteModal.show && deleteModal.doc && (
                <div
                    className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-fade-in"
                    onClick={() => setDeleteModal({ show: false, doc: null })}
                >
                    <div className="solid-modal rounded-2xl p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-red-500/20">
                                <Trash2 className="h-5 w-5 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete Document</h3>
                        </div>

                        <p className="text-[var(--text-secondary)] mb-3">
                            Are you sure you want to delete this document? This will also remove all indexed content.
                        </p>

                        <div className="glass-card rounded-xl p-4 mb-6 border border-[var(--card-border)]">
                            <h4 className="text-[var(--text-primary)] font-medium truncate">{deleteModal.doc.name}</h4>
                            <p className="text-[var(--text-tertiary)] text-sm mt-1">
                                {deleteModal.doc.page_count} pages • {deleteModal.doc.chunk_count || 0} chunks
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModal({ show: false, doc: null })}
                                className="flex-1 bg-[var(--card-bg)] hover:bg-[var(--card-border)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold border border-[var(--card-border)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {renameModal.show && renameModal.doc && (
                <div
                    className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-fade-in"
                    onClick={() => setRenameModal({ show: false, doc: null })}
                >
                    <div className="solid-modal rounded-2xl p-6 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-blue-500/20">
                                <Pencil className="h-5 w-5 text-blue-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Rename Document</h3>
                        </div>

                        <div className="mb-4">
                            <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Document Name</label>
                            <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                placeholder="Enter document name"
                                className="w-full p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-blue-500 transition-colors"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !renaming) {
                                        handleRename();
                                    }
                                }}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setRenameModal({ show: false, doc: null })}
                                className="flex-1 bg-[var(--card-bg)] hover:bg-[var(--card-border)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold border border-[var(--card-border)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRename}
                                disabled={renaming || !renameValue.trim() || renameValue.trim() === renameModal.doc.name}
                                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {renaming && <Loader2 className="h-4 w-4 animate-spin" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-in-up">
                <div className="pl-16 lg:pl-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">Documents</h1>
                    <p className="text-sm md:text-base text-[var(--text-secondary)]">
                        Upload financial documents to ask questions with AI
                    </p>
                </div>
                <button
                    onClick={() => loadDocuments(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 glass-card rounded-xl hover:bg-[var(--card-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`h-4 w-4 text-[var(--text-secondary)] ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="text-[var(--text-secondary)] text-sm">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
            </div>

            {/* Upload Zone */}
            <div
                className={`glass-card rounded-2xl p-8 mb-6 border-2 border-dashed transition-all duration-300 animate-slide-in-up relative overflow-hidden ${dragActive
                    ? 'border-blue-500 bg-blue-500/10 scale-[1.02] shadow-lg shadow-blue-500/20'
                    : 'border-[var(--card-border)] hover:border-blue-400'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {/* Drag overlay indicator */}
                {dragActive && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center z-10 animate-fade-in">
                        {/* <div className="flex flex-col items-center gap-3">
                            <div className="p-4 rounded-full bg-blue-500/30">
                                <Upload className="h-10 w-10 text-blue-400" />
                            </div>
                            <p className="text-lg font-semibold text-blue-400">Drop your PDF here</p>
                        </div> */}
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    className="hidden"
                />

                <div className={`text-center ${dragActive ? 'opacity-30' : ''}`}>
                    {uploading ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                            </div>
                            <p className="text-[var(--text-secondary)]">{uploadProgress}</p>
                        </div>
                    ) : (
                        <>
                            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 mb-4">
                                <Upload className="h-8 w-8 text-blue-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                                Upload Financial Documents
                            </h3>
                            <p className="text-[var(--text-secondary)] mb-4">
                                Drag & drop your PDF files here, or click to browse
                            </p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
                            >
                                Choose File
                            </button>
                            <p className="text-xs text-[var(--text-tertiary)] mt-4">
                                Supports PDF files up to 10MB • Credit cards, insurance, loans, etc.
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Documents List */}
            <div className="glass-card rounded-2xl p-6 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Your Documents
                    <span className="text-sm font-normal text-[var(--text-tertiary)]">({documents.length})</span>
                </h2>

                {documents.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="h-16 w-16 text-[var(--text-tertiary)] mx-auto mb-4 opacity-50" />
                        <p className="text-[var(--text-secondary)] mb-2">No documents uploaded yet</p>
                        <p className="text-sm text-[var(--text-tertiary)]">
                            Upload your first document to start asking questions
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {documents.map((doc, index) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-blue-400/50 transition-all duration-300 animate-slide-in-right"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`p-2 rounded-xl ${doc.status === 'ready' ? 'bg-green-500/20' :
                                        doc.status === 'processing' ? 'bg-yellow-500/20' :
                                            'bg-red-500/20'
                                        }`}>
                                        {doc.status === 'ready' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                        {doc.status === 'processing' && <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />}
                                        {doc.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="font-medium text-[var(--text-primary)] truncate">{doc.name}</h3>
                                        <div className="flex items-center gap-3 text-sm text-[var(--text-tertiary)]">
                                            <span>{formatFileSize(doc.file_size)}</span>
                                            {doc.page_count > 0 && <span>• {doc.page_count} pages</span>}
                                            {doc.chunk_count !== undefined && doc.chunk_count > 0 && <span>• {doc.chunk_count} chunks</span>}
                                            <span>• {formatDate(doc.created_at)}</span>
                                        </div>
                                        {doc.status === 'error' && doc.error_message && (
                                            <p className="text-sm text-red-400 mt-1">{doc.error_message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openRenameModal(doc)}
                                        className="p-2 rounded-lg hover:bg-blue-500/20 transition-colors group"
                                        title="Rename document"
                                    >
                                        <Pencil className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-blue-500" />
                                    </button>
                                    <button
                                        onClick={() => handleDownload(doc)}
                                        disabled={downloading === doc.id || doc.status !== 'ready'}
                                        className="p-2 rounded-lg hover:bg-blue-500/20 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Download document"
                                    >
                                        {downloading === doc.id ? (
                                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-blue-500" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setDeleteModal({ show: true, doc })}
                                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors group"
                                        title="Delete document"
                                    >
                                        <Trash2 className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-red-500" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Usage Tips */}
            <div className="glass-card rounded-2xl p-6 mt-6 animate-slide-in-up" style={{ animationDelay: '200ms' }}>
                <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3">💡 How to use</h3>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                    <li className="flex items-start gap-2">
                        <span className="text-blue-500">1.</span>
                        Upload your financial PDFs (credit card T&Cs, insurance policies, loan agreements)
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-500">2.</span>
                        Wait for processing to complete (documents will show &quot;ready&quot; status)
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-500">3.</span>
                        Go to Dashboard and ask AI questions like:
                        <ul className="ml-6 mt-1 space-y-1 text-[var(--text-tertiary)]">
                            <li>• &quot;Does my travel insurance cover lost baggage?&quot;</li>
                            <li>• &quot;What&apos;s the cashback rate for petrol on my card?&quot;</li>
                            <li>• &quot;What are the fees for late payment?&quot;</li>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>
    );
}
