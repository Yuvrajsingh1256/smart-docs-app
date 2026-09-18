import { useEffect, useRef, useState } from 'react';
import { LogOut, FileText, MessageSquarePlus } from 'lucide-react';
import api from '../api.js';
import FileUpload from '../components/FileUpload.jsx';
import DocumentList from '../components/DocumentList.jsx';
import ChatWindow from '../components/ChatWindow.jsx';

export default function Dashboard({ onLogout }) {
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const pollRef = useRef(null);

  const loadDocuments = async () => {
    const { data } = await api.get('/documents');
    setDocuments(data);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing');
    if (hasProcessing) {
      pollRef.current = setInterval(loadDocuments, 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [documents]);

  const startChat = async (doc) => {
    setActiveDoc(doc);
    const { data } = await api.post('/chat/sessions', { documentId: doc.id });
    setSessionId(data.sessionId);
  };

  const deleteDocument = async (docId) => {
    await api.delete(`/documents/${docId}`);
    if (activeDoc?.id === docId) {
      setActiveDoc(null);
      setSessionId(null);
    }
    await loadDocuments();
  };

  const readyCount = documents.filter((d) => d.status === 'ready').length;

  return (
    <div className="min-h-screen flex text-paper">
      <aside className="w-72 border-r border-edge flex flex-col p-4 bg-inkDeep/40">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-moss" />
            <h1 className="font-serif text-lg">Smart Docs</h1>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <LogOut size={12} /> Log out
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          {readyCount} document{readyCount === 1 ? '' : 's'} ready
        </p>

        <FileUpload onUploaded={loadDocuments} />

        <div className="mt-6 flex-1 overflow-y-auto">
          <DocumentList
            documents={documents}
            activeId={activeDoc?.id}
            onSelect={startChat}
            onDelete={deleteDocument}
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {sessionId ? (
          <ChatWindow key={sessionId} sessionId={sessionId} document={activeDoc} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-full bg-panel border border-edge flex items-center justify-center mb-4">
              <MessageSquarePlus size={22} className="text-slate-500" />
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              Upload a document on the left, then select it to start asking questions.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}