import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Sparkles } from 'lucide-react';
import api from '../api.js';

export default function Register({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      onLogin(data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-inkDeep border-r border-edge">
        <div className="absolute inset-0 bg-gradient-to-br from-moss/10 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-2 text-paper">
            <FileText size={20} className="text-moss" />
            <span className="font-serif text-lg">Smart Docs</span>
          </div>
          <div>
            <h2 className="font-serif text-4xl leading-tight text-paper mb-4">
              Grounded answers,
              <br />
              every time.
            </h2>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Every answer is backed by a source citation from your own document — and if it's
              not in there, we'll tell you honestly instead of guessing.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles size={14} className="text-mossLight" />
            Powered by retrieval-augmented generation
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 text-paper">
            <FileText size={20} className="text-moss" />
            <span className="font-serif text-lg">Smart Docs</span>
          </div>

          <h1 className="font-serif text-3xl mb-1 text-paper">Create your account</h1>
          <p className="text-sm text-slate-400 mb-8">Start chatting with your documents in minutes.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5 text-slate-300">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-panel border border-edge px-3.5 py-2.5 text-sm outline-none focus:border-moss focus:ring-1 focus:ring-moss/40 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5 text-slate-300">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-panel border border-edge px-3.5 py-2.5 text-sm outline-none focus:border-moss focus:ring-1 focus:ring-moss/40 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5 text-slate-300">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-panel border border-edge px-3.5 py-2.5 text-sm outline-none focus:border-moss focus:ring-1 focus:ring-moss/40 transition-shadow"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-moss py-2.5 text-sm font-medium text-white hover:bg-mossLight active:scale-[0.99] disabled:opacity-50 transition-all shadow-glow"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-mossLight hover:text-moss font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}