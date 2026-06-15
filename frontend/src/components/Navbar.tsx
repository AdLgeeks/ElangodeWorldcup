import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Bell } from 'lucide-react';

interface NavbarProps {
  onNotificationClick?: () => void;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onNotificationClick, unreadCount = 0 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30">
      {/* Brand Logo */}
      <Link to="/" className="font-display-lg text-display-lg-mobile md:text-display-lg font-extrabold text-primary tracking-tighter hover:opacity-90 transition-opacity">
        Elangode
      </Link>

      {/* Navigation Links */}
      <div className="hidden md:flex items-center gap-stack-lg">
        {user.role === 'admin' ? (
          <>
            <Link
              to="/admin"
              className={`transition-colors font-label-md text-label-md ${
                isActive('/admin') ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Admin Dashboard
            </Link>
            <Link
              to="/leaderboard"
              className={`transition-colors font-label-md text-label-md ${
                isActive('/leaderboard') ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Leaderboard
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/dashboard"
              className={`transition-colors font-label-md text-label-md ${
                isActive('/dashboard') ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/leaderboard"
              className={`transition-colors font-label-md text-label-md ${
                isActive('/leaderboard') ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Leaderboard
            </Link>
          </>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-stack-md">
        {/* Notification Bell */}
        {user.role === 'user' && (
          <button
            onClick={onNotificationClick}
            className="relative text-on-surface-variant hover:text-primary transition-all p-2 rounded-full hover:bg-surface-container-highest/50"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        )}

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-highest/50 border border-outline-variant/30 hover:border-primary transition-colors"
          >
            <span className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center text-secondary text-sm font-bold">
              {user.full_name[0].toUpperCase()}
            </span>
            <span className="font-label-md text-label-md hidden sm:inline">{user.full_name}</span>
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-surface-container border border-outline-variant/30 p-2 shadow-2xl z-50">
              {user.role === 'user' && (
                <Link
                  to="/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50 transition-colors w-full text-left font-label-md"
                >
                  <UserIcon size={16} />
                  My Profile
                </Link>
              )}
              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-error hover:bg-error-container/20 transition-colors w-full text-left font-label-md mt-1"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
