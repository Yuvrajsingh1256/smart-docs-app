import { useEffect, useRef, useState } from 'react';
import { Send, FileText, Bot, User } from 'lucide-react';
import api from '../api.js';

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce1" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce1" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce1" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

function Avatar({ role }) {
  if (role === 'user') {
    return (
      <div className="w-7 h-7 rounded-full bg-moss/20 border border-moss/30 flex items-center justify-center shrink-0">
        <User size={13} className="text-mossLight" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-panelLight border border-edge flex items-center justify-center shrink-0">
      <Bot size={13} className="text-slate-400" />
    </div>
  );
}

export default function ChatWindow({ sessionId, document }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    api.get(`/chat/sessions/${sessionId}/messages`).then(({ data }) => setMessages(data));
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const updateLastMessage = (updater) => {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      updated[updated.length - 1] = updater(last);
      return updated;
    });
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userText = input;
    setInput('');
    setSending(true);
    requestAnimationFrame(autoResize);

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userText },
      { role: 'assistant', content: '', sources: [] },
    ]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userText }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop();

        for (const frame of frames) {
          if (!frame.trim()) continue;

          let eventName = 'message';
          let data = '';
          for (const line of frame.split('\n')) {
            if (line.startsWith('event: ')) eventName = line.slice(7);
            if (line.startsWith('data: ')) data = line.slice(6);
          }
          if (!data) continue;

          const parsed = JSON.parse(data);

          if (eventName === 'sources') {
            updateLastMessage((last) => ({ ...last, sources: parsed }));
          } else if (eventName === 'chunk') {
            updateLastMessage((last) => ({ ...last, content: last.content + parsed.text }));
          } else if (eventName === 'error') {
            updateLastMessage((last) => ({
              ...last,
              content: parsed.message || 'Something went wrong. Please try again.',
            }));
          }
        }
      }
    } catch (err) {
      updateLastMessage((last) => ({
        ...last,
        content: 'Something went wrong generating a response. Please try again.',
      }));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(e);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-edge px-6 py-4 flex items-center gap-2.5 bg-inkDeep/30">
        <FileText size={15} className="text-slate-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-slate-500 leading-none mb-0.5">Chatting with</p>
          <h2 className="font-serif text-base truncate">{document?.original_name}</h2>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {messages.map((m, i) => {
          const isEmptyAssistant = m.role === 'assistant' && m.content === '';
          const isLast = i === messages.length - 1;

          return (
            <div key={i} className={`flex gap-3 max-w-2xl animate-fade-in ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <Avatar role={m.role} />
              <div className={m.role === 'user' ? 'items-end flex flex-col' : ''}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap shadow-card ${
                    m.role === 'user'
                      ? 'bg-moss text-white rounded-tr-sm'
                      : 'bg-panel text-paper rounded-tl-sm'
                  }`}
                >
                  {isEmptyAssistant && sending && isLast ? <TypingDots /> : m.content}
                </div>
                {m.sources?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.sources.map((s) => (
                      <span
                        key={s.index}
                        title={s.excerpt}
                        className="text-[11px] px-2 py-1 rounded-full bg-panelLight border border-edge text-slate-400 cursor-help hover:border-moss/50 hover:text-slate-300 transition-colors"
                      >
                        Source {s.index} · {s.similarity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="border-t border-edge p-4 flex gap-2 items-end bg-inkDeep/30">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoResize();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about this document..."
          className="flex-1 rounded-xl bg-panel border border-edge px-4 py-2.5 text-sm outline-none focus:border-moss focus:ring-1 focus:ring-moss/40 transition-shadow leading-relaxed"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-xl bg-moss w-10 h-10 flex items-center justify-center text-white hover:bg-mossLight active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          title="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}