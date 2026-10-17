import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Shield, UserCheck, Key, Mail, UserPlus, LogIn, AlertCircle, HardHat, Database, Server } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register, error, clearError, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole>('user');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        await register(email.trim(), password, requestedRole);
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      // Handled in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string, role: UserRole) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setRequestedRole(role);
    setLocalError(null);
    clearError();
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Bar */}
        <div className="bg-[#1a1a1a] text-[#E4E3E0] p-6 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[#d71920] font-black text-2xl tracking-tighter">HALLIBURTON</div>
            <span className="text-[10px] font-mono bg-[#d71920] text-white px-2 py-0.5 uppercase font-bold">
              SYS-AUTH
            </span>
          </div>
          <div className="text-[10px] opacity-70 uppercase tracking-[0.2em] font-mono">
            Personnel Tracking Portal [Firestore]
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white border-2 border-t-0 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414]">
          {/* Tab buttons */}
          <div className="flex border-2 border-[#141414] mb-6 bg-[#f5f5f5]">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                clearError();
                setLocalError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                !isRegister
                  ? 'bg-[#141414] text-white'
                  : 'text-[#141414] hover:bg-gray-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                clearError();
                setLocalError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                isRegister
                  ? 'bg-[#d71920] text-white'
                  : 'text-[#141414] hover:bg-gray-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {(error || localError) && (
              <div className="p-3 bg-red-100 border-2 border-[#d71920] text-xs text-[#d71920] font-mono font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#d71920] shrink-0 mt-0.5" />
                <span>{localError || error}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#141414] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. engineer@halliburton.com"
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] pl-9 pr-3 py-2 text-xs font-mono text-[#141414] placeholder-gray-500 focus:outline-none focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] mb-1">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-[#141414] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#f9f9f9] border-2 border-[#141414] pl-9 pr-3 py-2 text-xs font-mono text-[#141414] placeholder-gray-500 focus:outline-none focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* Info on Account Creation */}
            {isRegister && (
              <div className="p-3 bg-[#f5f5f5] border-2 border-[#141414] space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#141414] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#d71920]" />
                  Firestore <span className="text-[#d71920]">users/{'{uid}'}</span> Auto Provisioning
                </label>
                <p className="text-[10px] font-mono text-gray-600">
                  On signup, a document <code className="text-[#d71920] font-bold">users/{'{uid}'}</code> will be created with <code className="font-bold text-[#141414]">role: "user"</code> and <code className="font-bold text-[#141414]">personId: ""</code> (to be assigned by an admin).
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full bg-[#141414] hover:bg-[#d71920] text-white font-bold py-2.5 px-4 text-xs uppercase tracking-widest border-2 border-[#141414] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Authenticate
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill */}
          <div className="mt-6 pt-4 border-t-2 border-[#141414]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2">
              Preset Quick Test Accounts
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  handleDemoFill('admin@halliburton-tracker.com', 'Admin123!', 'admin');
                }}
                className="p-2 bg-[#f5f5f5] hover:bg-[#141414] hover:text-white border border-[#141414] text-left transition-colors group"
              >
                <div className="font-bold text-[#d71920] group-hover:text-white text-[10px] uppercase font-mono">
                  ADMIN ACCOUNT
                </div>
                <div className="text-[9px] font-mono opacity-80 truncate">admin@halliburton-tracker.com</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  handleDemoFill('engineer@halliburton-tracker.com', 'User123!', 'user');
                }}
                className="p-2 bg-[#f5f5f5] hover:bg-[#141414] hover:text-white border border-[#141414] text-left transition-colors group"
              >
                <div className="font-bold text-blue-700 group-hover:text-white text-[10px] uppercase font-mono">
                  STANDARD USER
                </div>
                <div className="text-[9px] font-mono opacity-80 truncate">engineer@halliburton-tracker.com</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#1a1a1a] text-white border-2 border-t-0 border-[#141414] text-[9px] font-mono opacity-90 text-center space-y-1">
          <div>FIREBASE_AUTH: EMAIL_PASSWORD</div>
          <div className="text-gray-400">FIRESTORE_PROJECT: personnel-tracker-halliburton</div>
        </div>
      </div>
    </div>
  );
};
