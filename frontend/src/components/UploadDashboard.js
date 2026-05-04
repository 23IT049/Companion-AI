import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Upload, FileText, Trash2, RefreshCw, CheckCircle, XCircle,
    Clock, AlertCircle, Filter, X, ChevronDown, Loader, BookOpen,
    CloudUpload, Search
} from 'lucide-react';
import { documentsAPI } from '../services/api';
import './UploadDashboard.css';

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS_META = {
    indexed:    { label: 'Indexed',    icon: CheckCircle,   cls: 'status-indexed'  },
    pending:    { label: 'Pending',    icon: Clock,         cls: 'status-pending'  },
    processing: { label: 'Processing', icon: Loader,        cls: 'status-processing'},
    failed:     { label: 'Failed',     icon: XCircle,       cls: 'status-failed'   },
};

function StatusBadge({ status }) {
    const meta = STATUS_META[status] || STATUS_META.pending;
    const Icon = meta.icon;
    return (
        <span className={`status-badge ${meta.cls}`}>
            <Icon size={12} className={status === 'processing' ? 'spin-icon' : ''} />
            {meta.label}
        </span>
    );
}

function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024)       return `${bytes} B`;
    if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

// ─── Upload Form ─────────────────────────────────────────────────────────────

function UploadForm({ onUploaded }) {
    const [file, setFile]           = useState(null);
    const [deviceType, setDevType]  = useState('');
    const [brand, setBrand]         = useState('');
    const [model, setModel]         = useState('');
    const [dragging, setDragging]   = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress]   = useState(0);
    const [error, setError]         = useState('');
    const [success, setSuccess]     = useState('');
    const fileRef = useRef();

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) pickFile(dropped);
    }, []);

    const pickFile = (f) => {
        const ext = f.name.split('.').pop().toLowerCase();
        if (!['pdf', 'txt', 'docx'].includes(ext)) {
            setError('Only PDF, TXT and DOCX files are allowed.');
            return;
        }
        setError('');
        setFile(f);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !deviceType.trim() || !brand.trim()) {
            setError('File, device type and brand are required.');
            return;
        }
        setUploading(true);
        setError('');
        setSuccess('');
        setProgress(0);

        // Simulate progress while uploading
        const timer = setInterval(() => setProgress(p => Math.min(p + 3, 90)), 200);

        try {
            await documentsAPI.uploadManual(file, deviceType.trim(), brand.trim(), model.trim() || undefined);
            clearInterval(timer);
            setProgress(100);
            setSuccess(`"${file.name}" uploaded and queued for processing!`);
            setFile(null);
            setDevType('');
            setBrand('');
            setModel('');
            if (fileRef.current) fileRef.current.value = '';
            setTimeout(() => { setProgress(0); setSuccess(''); }, 3500);
            onUploaded();
        } catch (err) {
            clearInterval(timer);
            setProgress(0);
            setError(err?.response?.data?.detail || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="upload-form-card glass-effect">
            <div className="upload-form-header">
                <CloudUpload size={22} />
                <h2>Upload Device Manual</h2>
            </div>

            <form onSubmit={handleSubmit} className="upload-form">
                {/* Drop zone */}
                <div
                    className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => !file && fileRef.current?.click()}
                >
                    {file ? (
                        <div className="file-preview">
                            <FileText size={36} className="file-icon" />
                            <div className="file-details">
                                <span className="file-name">{file.name}</span>
                                <span className="file-size">{formatSize(file.size)}</span>
                            </div>
                            <button
                                type="button"
                                className="remove-file-btn"
                                onClick={e => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                                title="Remove file"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="drop-prompt">
                            <Upload size={40} className="drop-icon" />
                            <p className="drop-text">Drag &amp; drop your manual here</p>
                            <p className="drop-sub">or click to browse — PDF, TXT, DOCX</p>
                        </div>
                    )}
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.txt,.docx"
                        style={{ display: 'none' }}
                        onChange={e => e.target.files[0] && pickFile(e.target.files[0])}
                    />
                </div>

                {/* Metadata fields */}
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="ud-device-type">Device Type <span className="required">*</span></label>
                        <input
                            id="ud-device-type"
                            type="text"
                            placeholder="e.g. Refrigerator"
                            value={deviceType}
                            onChange={e => setDevType(e.target.value)}
                            disabled={uploading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="ud-brand">Brand <span className="required">*</span></label>
                        <input
                            id="ud-brand"
                            type="text"
                            placeholder="e.g. Samsung"
                            value={brand}
                            onChange={e => setBrand(e.target.value)}
                            disabled={uploading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="ud-model">Model <span className="optional">(optional)</span></label>
                        <input
                            id="ud-model"
                            type="text"
                            placeholder="e.g. RF28T5001SG"
                            value={model}
                            onChange={e => setModel(e.target.value)}
                            disabled={uploading}
                        />
                    </div>
                </div>

                {/* Feedback */}
                {error   && <div className="form-alert error"><AlertCircle size={15} />{error}</div>}
                {success && <div className="form-alert success"><CheckCircle size={15} />{success}</div>}

                {/* Progress bar */}
                {uploading && (
                    <div className="progress-bar-wrap">
                        <div className="progress-bar" style={{ width: `${progress}%` }} />
                    </div>
                )}

                <button type="submit" className="upload-submit-btn" disabled={uploading || !file}>
                    {uploading ? <><Loader size={16} className="spin-icon" /> Uploading…</> : <><Upload size={16} /> Upload Manual</>}
                </button>
            </form>
        </div>
    );
}

// ─── Document Table ───────────────────────────────────────────────────────────

function DocumentTable({ documents, onDelete, onReindex, loading }) {
    if (loading) return (
        <div className="doc-table-empty">
            <Loader size={28} className="spin-icon" />
            <p>Loading documents…</p>
        </div>
    );

    if (documents.length === 0) return (
        <div className="doc-table-empty">
            <BookOpen size={40} />
            <p>No manuals found. Upload one above to get started.</p>
        </div>
    );

    return (
        <div className="doc-table-wrap">
            <table className="doc-table">
                <thead>
                    <tr>
                        <th>Filename</th>
                        <th>Device</th>
                        <th>Brand</th>
                        <th>Model</th>
                        <th>Chunks</th>
                        <th>Uploaded</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {documents.map(doc => (
                        <tr key={doc.document_id} className="doc-row fade-in">
                            <td className="doc-filename" title={doc.filename}>
                                <FileText size={14} />
                                <span>{doc.filename}</span>
                            </td>
                            <td>{doc.device_type}</td>
                            <td>{doc.brand}</td>
                            <td>{doc.model || <span className="muted">—</span>}</td>
                            <td className="centered">{doc.chunks_count ?? '—'}</td>
                            <td className="centered">{formatDate(doc.uploaded_at)}</td>
                            <td><StatusBadge status={doc.status} /></td>
                            <td className="doc-actions">
                                {doc.status === 'failed' && (
                                    <button
                                        className="action-btn reindex-btn"
                                        title="Re-index document"
                                        onClick={() => onReindex(doc.document_id)}
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                )}
                                <button
                                    className="action-btn delete-btn"
                                    title="Delete document"
                                    onClick={() => onDelete(doc.document_id, doc.filename)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['', 'indexed', 'pending', 'processing', 'failed'];

function Filters({ search, onSearch, statusFilter, onStatusFilter, onRefresh }) {
    return (
        <div className="doc-filters">
            <div className="filter-search">
                <Search size={15} />
                <input
                    type="text"
                    placeholder="Search filename, device, brand…"
                    value={search}
                    onChange={e => onSearch(e.target.value)}
                />
                {search && <button className="filter-clear" onClick={() => onSearch('')}><X size={13} /></button>}
            </div>

            <div className="filter-select-wrap">
                <Filter size={14} />
                <select value={statusFilter} onChange={e => onStatusFilter(e.target.value)}>
                    {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s ? STATUS_META[s]?.label : 'All statuses'}</option>
                    ))}
                </select>
                <ChevronDown size={13} className="select-caret" />
            </div>

            <button className="refresh-btn" onClick={onRefresh} title="Refresh list">
                <RefreshCw size={15} />
                <span>Refresh</span>
            </button>
        </div>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function ConfirmModal({ filename, onConfirm, onCancel, busy }) {
    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div className="confirm-modal glass-effect" onClick={e => e.stopPropagation()}>
                <div className="confirm-icon"><Trash2 size={24} /></div>
                <h3>Delete Manual</h3>
                <p>Are you sure you want to delete <strong>{filename}</strong>? This will also remove it from the vector store.</p>
                <div className="confirm-actions">
                    <button className="btn-cancel" onClick={onCancel} disabled={busy}>Cancel</button>
                    <button className="btn-delete" onClick={onConfirm} disabled={busy}>
                        {busy ? <><Loader size={14} className="spin-icon" /> Deleting…</> : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function UploadDashboard({ onClose }) {
    const [documents, setDocuments]       = useState([]);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [toDelete, setToDelete]         = useState(null); // { id, filename }
    const [deleteBusy, setDeleteBusy]     = useState(false);
    const [toast, setToast]               = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchDocs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await documentsAPI.listDocuments(undefined, undefined, statusFilter || undefined);
            setDocuments(Array.isArray(data) ? data : []);
        } catch {
            showToast('Failed to load documents.', 'error');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchDocs(); }, [fetchDocs]);

    const filtered = documents.filter(doc => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            doc.filename?.toLowerCase().includes(q) ||
            doc.device_type?.toLowerCase().includes(q) ||
            doc.brand?.toLowerCase().includes(q) ||
            doc.model?.toLowerCase().includes(q)
        );
    });

    const handleDelete = async () => {
        if (!toDelete) return;
        setDeleteBusy(true);
        try {
            await documentsAPI.deleteDocument(toDelete.id);
            showToast(`"${toDelete.filename}" deleted successfully.`);
            setDocuments(prev => prev.filter(d => d.document_id !== toDelete.id));
        } catch {
            showToast('Delete failed. Please try again.', 'error');
        } finally {
            setDeleteBusy(false);
            setToDelete(null);
        }
    };

    const handleReindex = async (id) => {
        try {
            await documentsAPI.reindexDocument(id);
            showToast('Re-indexing started!');
            fetchDocs();
        } catch {
            showToast('Re-index failed.', 'error');
        }
    };

    return (
        <div className="ud-overlay">
            <div className="ud-panel glass-effect">

                {/* Header */}
                <div className="ud-panel-header">
                    <div className="ud-panel-title">
                        <BookOpen size={20} />
                        <h1>Manual Library</h1>
                        <span className="doc-count-badge">{documents.length}</span>
                    </div>
                    {onClose && (
                        <button className="ud-close-btn" onClick={onClose} title="Close">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="ud-panel-body">
                    <UploadForm onUploaded={fetchDocs} />

                    <div className="doc-list-section glass-effect">
                        <div className="doc-list-header">
                            <h2>Uploaded Manuals</h2>
                        </div>
                        <Filters
                            search={search}
                            onSearch={setSearch}
                            statusFilter={statusFilter}
                            onStatusFilter={setStatusFilter}
                            onRefresh={fetchDocs}
                        />
                        <DocumentTable
                            documents={filtered}
                            onDelete={(id, name) => setToDelete({ id, filename: name })}
                            onReindex={handleReindex}
                            loading={loading}
                        />
                    </div>
                </div>

                {/* Toast */}
                {toast && (
                    <div className={`ud-toast ${toast.type}`}>
                        {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {toast.msg}
                    </div>
                )}
            </div>

            {/* Delete confirm */}
            {toDelete && (
                <ConfirmModal
                    filename={toDelete.filename}
                    onConfirm={handleDelete}
                    onCancel={() => setToDelete(null)}
                    busy={deleteBusy}
                />
            )}
        </div>
    );
}

export default UploadDashboard;
