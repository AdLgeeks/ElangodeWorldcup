import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, User as UserIcon, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const user = await login(trimmedName);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-margin-mobile relative bg-surface">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 blur-3xl rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary-container/5 blur-3xl rounded-full pointer-events-none"></div>

      <div className="glass-card w-full max-w-md rounded-2xl p-8 relative z-10 flex flex-col">
        <div className="text-center mb-8">
          <h1 className="font-display-lg text-headline-lg text-primary font-black tracking-tight mb-2">Elangode</h1>
          <p className="text-on-surface-variant text-body-md">Enter your name to start predicting matches</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-error-container/20 border border-error/30 rounded-xl p-4 text-error text-label-md mb-6">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-stack-md">
          <div>
            <label className="block text-label-md text-on-surface mb-2" htmlFor="name">
              Your Unique Name
            </label>
            <div className="relative">
              <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John"
                className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 pl-12 pr-4 text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/10 flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Entering...' : 'Enter App'}
            {!loading && <LogIn size={18} />}
          </button>
        </form>

        <div className="text-center mt-8 space-y-4">
          <p className="text-on-surface-variant text-body-xs italic">
            * If your name is new, a new account will be created automatically.
          </p>
          <div className="pt-4 border-t border-outline-variant/10">
            <Link to="/admin/login" className="text-secondary-fixed-dim hover:text-secondary hover:underline text-[12px] font-bold tracking-wider uppercase">
              Admin Portal Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
