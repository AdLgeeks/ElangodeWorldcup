import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { User, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName) {
      setError('Full name cannot be empty.');
      return;
    }

    if (password) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      await updateProfile(fullName, password || undefined);
      setSuccess('Profile updated successfully!');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Navbar />

      <main className="pt-24 pb-32 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="max-w-md mx-auto space-y-stack-lg">
          <div>
            <h1 className="font-display-lg text-headline-lg text-primary font-black tracking-tight">Edit Profile</h1>
            <p className="text-on-surface-variant text-body-md mt-1">Update your display name and change your password</p>
          </div>

          <section className="glass-card rounded-2xl p-8 border-outline-variant/30">
            {error && (
              <div className="flex items-center gap-3 bg-error-container/20 border border-error/30 rounded-xl p-4 text-error text-label-md mb-6">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 bg-tertiary-container/20 border border-tertiary/30 rounded-xl p-4 text-tertiary text-label-md mb-6">
                <CheckCircle size={20} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-stack-md">
              <div>
                <label className="block text-label-md text-on-surface mb-2">Registered Email</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface-variant cursor-not-allowed font-body-md"
                />
                <span className="text-[10px] text-outline mt-1 block">Email address cannot be changed.</span>
              </div>

              <div>
                <label className="block text-label-md text-on-surface mb-2" htmlFor="fullName">
                  Full Name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 pl-12 pr-4 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant/10">
                <h3 className="font-label-md text-secondary uppercase tracking-wider mb-4">Change Password</h3>
                
                <div className="space-y-stack-md">
                  <div>
                    <label className="block text-label-md text-on-surface mb-2" htmlFor="newPassword">
                      New Password (Optional)
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                      <input
                        id="newPassword"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 pl-12 pr-4 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-label-md text-on-surface mb-2" htmlFor="confirmNewPassword">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                      <input
                        id="confirmNewPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 pl-12 pr-4 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body-md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/10 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                <Save size={18} />
                {loading ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};
