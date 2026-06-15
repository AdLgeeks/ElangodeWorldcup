import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    
    setError(null);
    setLoading(true);
    try {
      await register(email, password, fullName);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Email might already be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-margin-mobile relative bg-surface">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 blur-3xl rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary-container/5 blur-3xl rounded-full pointer-events-none"></div>

      <div className="glass-card w-full max-w-md rounded-2xl p-8 relative z-10 flex flex-col">
        <div className="text-center mb-8">
          <h1 className="font-display-lg text-headline-lg text-primary font-black tracking-tight mb-2">Create Account</h1>
          <p className="text-on-surface-variant text-body-md">Register to join the Prediction Platform</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-error-container/20 border border-error/30 rounded-xl p-4 text-error text-label-md mb-6">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 bg-tertiary-container/20 border border-tertiary/30 rounded-xl p-4 text-tertiary text-label-md mb-6 animate-pulse">
            <CheckCircle2 size={20} />
            <span>Account created successfully! Redirecting to login...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-stack-md">
          <div>
            <label className="block text-label-md text-on-surface mb-2" htmlFor="fullName">
              Full Name
            </label>
            <div className="relative">
              <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 pl-12 pr-4 text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-label-md text-on-surface mb-2" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 pl-12 pr-4 text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-label-md text-on-surface mb-2" htmlFor="password">
              Password (Min 6 chars)
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 pl-12 pr-4 text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-label-md text-on-surface mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 pl-12 pr-4 text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/10 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Creating Account...' : 'Register'}
            {!loading && <UserPlus size={18} />}
          </button>
        </form>

        <p className="text-center mt-6 text-on-surface-variant text-label-md">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-bold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
