import { useState } from 'react';
import { FileText, Trash2, Loader2, Check, X } from 'lucide-react';

export default function DocumentList({ documents, activeId, onSelect, onDelete }) {
  const [confirmingId, setConfirmingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const handleDelete = async (id) => {
    setDeletingId(id);
    setError('');
    try {
      await onDelete(id);
    } catch (err) {
      setError('Could not delete document. Please try again.');
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText size={28} className="mx-auto text-slate-600 mb-2" strokeWidth={1.5} />
        <p className="text-sm text-slate-500">No documents yet.</p>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
      <ul className="space-y-1">
        {documents.map((doc) => {
          const isConfirming = confirmingId === doc.id;
          const isDeleting = deletingId === doc.id;

          if (isConfirming) {
            return (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-panel border border-edge"
              >
                <span className="text-xs text-slate-300 truncate">Delete this document?</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={isDeleting}
                    className="p-1 rounded text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    title="Confirm delete"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    disabled={isDeleting}
                    className="p-1 rounded text-slate-400 hover:bg-white/5 disabled:opacity-50"
                    title="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </li>
            );
          }

          return (
            <li key={doc.id} className="group relative">
              <button
                onClick={() => doc.status === 'ready' && onSelect(doc)}
                disabled={doc.status !== 'ready'}
                className={`w-full text-left px-3 py-2 pr-8 rounded-md text-sm truncate flex items-center gap-2 transition-colors ${
                  activeId === doc.id ? 'bg-panel text-white' : 'text-slate-300 hover:bg-panel'
                } ${doc.status !== 'ready' ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <FileText size={14} className="shrink-0 text-slate-500" />
                <span className="truncate flex-1">{doc.original_name}</span>
                {doc.status === 'processing' && (
                  <span className="text-xs text-slate-500 shrink-0 flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" /> Processing
                  </span>
                )}
                {doc.status === 'failed' && (
                  <span className="text-xs text-red-400 shrink-0">Failed</span>
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmingId(doc.id);
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-opacity"
                title="Delete document"
              >
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}