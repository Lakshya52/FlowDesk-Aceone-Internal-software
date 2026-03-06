import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Download, Trash2, Upload, FileText } from 'lucide-react';
import { format } from 'date-fns';

const FilesPage: React.FC = () => {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await api.get('/files');
                setFiles(data.attachments || []);
            } catch { }
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const { data } = await api.post('/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setFiles(prev => [data.attachment, ...prev]);
        } catch { }
    };

    const downloadFile = async (fileId: string, originalName: string) => {
        try {
            const response = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', originalName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch { }
    };

    const deleteFile = async (fileId: string) => {
        if (!confirm('Delete this file?')) return;
        try {
            await api.delete(`/files/${fileId}`);
            setFiles(prev => prev.filter(f => f._id !== fileId));
        } catch { }
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return '🖼️';
        if (type === 'application/pdf') return '📄';
        if (type.includes('spreadsheet') || type.includes('excel')) return '📊';
        if (type.includes('word') || type.includes('document')) return '📝';
        return '📎';
    };

    return (
        <div style={{ maxWidth: 900 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Files</h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{files.length} files</p>
                </div>
                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    <Upload size={16} /> Upload File
                    <input type="file" style={{ display: 'none' }} onChange={uploadFile} />
                </label>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />)}
                </div>
            ) : files.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                    <FileText size={48} style={{ margin: '0 auto 12px', color: 'var(--color-text-tertiary)', opacity: 0.3 }} />
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>No files uploaded</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Upload your first file to get started.</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {files.map(f => (
                        <div key={f._id} className="card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: '1.25rem' }}>{getFileIcon(f.fileType)}</span>
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{f.originalName}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                        {(f.fileSize / 1024).toFixed(1)} KB · Uploaded by {f.uploadedBy?.name} · {format(new Date(f.createdAt), 'MMM d, yyyy')}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => downloadFile(f._id, f.originalName)} title="Download">
                                    <Download size={14} />
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={() => deleteFile(f._id)} title="Delete" style={{ color: 'var(--color-danger)' }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FilesPage;
