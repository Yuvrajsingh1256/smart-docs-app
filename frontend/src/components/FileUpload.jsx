import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import api from '../api.js';

export default function FileUpload({ onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported right now.');
      return;
    }

    setError('');
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="flex flex-col items-center gap-2 border border-dashed border-edge rounded-md p-4 text-center text-sm text-slate-400 cursor-pointer hover:border-moss hover:text-slate-300 transition-colors">
        {uploading ? (
          <Loader2 size={18} className="animate-spin text-moss" />
        ) : (
          <Upload size={18} className="text-slate-500" />
        )}
        <span>{uploading ? 'Uploading...' : 'Upload a PDF'}</span>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </label>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}