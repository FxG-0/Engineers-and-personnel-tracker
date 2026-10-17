import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Wrench, Users, ShieldCheck, LogOut, HardHat, UserCheck, LayoutDashboard } from 'lucide-react';

interface NavbarProps {
  activeTab: 'my-records' | 'admin-dashboard' | 'engineers' | 'personnel' | 'users';
  setActiveTab: (tab: 'my-records' | 'admin-dashboard' | 'engineers' | 'personnel' | 'users') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, userRole, logout } = useAuth();

  return (
    <header className="bg-[#1a1a1a] border-b-2 border-[#141414] text-[#E4E3E0] sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#d71920] flex items-center justify-center font-bold text-white shadow-sm shrink-0 rounded-sm">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tighter text-white uppercase flex items-center gap-2">
                HALLIBURTON
                <span className="text-[10px] bg-[#d71920] text-white px-1.5 py-0.2 rounded-sm font-mono font-bold tracking-normal">
                  PTS v2.4
                </span>
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-[#A0A0A0] font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Firestore Live Feed
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('my-records')}
              className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-all flex items-center gap-2 rounded-sm ${
                activeTab === 'my-records'
                  ? 'bg-[#d71920] text-white border-[#d71920] shadow-sm'
                  : 'bg-[#242424] text-[#A0A0A0] border-[#333333] hover:text-white hover:border-[#555]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              My Records
              <span className="text-[9px] font-mono opacity-80 bg-black/40 px-1 py-0.5 rounded-xs">
                /my-records
              </span>
            </button>

            {userRole === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('admin-dashboard')}
                  className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-all flex items-center gap-2 rounded-sm ${
                    activeTab === 'admin-dashboard'
                      ? 'bg-[#d71920] text-white border-[#d71920] shadow-sm'
                      : 'bg-[#242424] text-[#A0A0A0] border-[#333333] hover:text-white hover:border-[#555]'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
                  Admin Dashboard
                  <span className="text-[9px] font-mono opacity-80 bg-black/40 px-1 py-0.5 rounded-xs">
                    /admin
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('engineers')}
                  className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-all flex items-center gap-2 rounded-sm ${
                    activeTab === 'engineers'
                      ? 'bg-[#d71920] text-white border-[#d71920] shadow-sm'
                      : 'bg-[#242424] text-[#A0A0A0] border-[#333333] hover:text-white hover:border-[#555]'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Engineers
                  <span className="text-[9px] font-mono opacity-80 bg-black/40 px-1 py-0.5 rounded-xs">
                    /engineers
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('personnel')}
                  className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-all flex items-center gap-2 rounded-sm ${
                    activeTab === 'personnel'
                      ? 'bg-[#d71920] text-white border-[#d71920] shadow-sm'
                      : 'bg-[#242424] text-[#A0A0A0] border-[#333333] hover:text-white hover:border-[#555]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Field Personnel
                  <span className="text-[9px] font-mono opacity-80 bg-black/40 px-1 py-0.5 rounded-xs">
                    /personnel
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-all flex items-center gap-2 rounded-sm ${
                    activeTab === 'users'
                      ? 'bg-[#d71920] text-white border-[#d71920] shadow-sm'
                      : 'bg-[#242424] text-[#A0A0A0] border-[#333333] hover:text-white hover:border-[#555]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Users & Roles
                  <span className="text-[9px] font-mono opacity-80 bg-black/40 px-1 py-0.5 rounded-xs">
                    /users
                  </span>
                </button>
              </>
            )}
          </nav>

          {/* Active User Info & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white truncate max-w-[160px]">
                  {currentUser?.email}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-xs ${
                    userRole === 'admin'
                      ? 'bg-[#d71920] text-white'
                      : 'bg-[#333333] text-emerald-400 border border-[#555]'
                  }`}
                >
                  {userRole || 'USER'}
                </span>
              </div>
              <div className="text-[9px] font-mono text-[#888888]">
                UID: {currentUser?.uid ? `${currentUser.uid.slice(0, 10)}...` : ''}
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="px-2.5 py-1.5 bg-[#242424] hover:bg-[#d71920] text-xs font-bold uppercase tracking-wider text-white border border-[#333333] rounded-sm transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex border-t border-[#333] py-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('my-records')}
            className={`flex-1 py-1 px-2 text-[10px] font-bold uppercase tracking-wider rounded-xs text-center border ${
              activeTab === 'my-records'
                ? 'bg-[#d71920] text-white border-[#d71920]'
                : 'bg-[#242424] text-[#A0A0A0] border-[#333]'
            }`}
          >
            My Records
          </button>
          {userRole === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('admin-dashboard')}
                className={`flex-1 py-1 px-2 text-[10px] font-bold uppercase tracking-wider rounded-xs text-center border ${
                  activeTab === 'admin-dashboard'
                    ? 'bg-[#d71920] text-white border-[#d71920]'
                    : 'bg-[#242424] text-[#A0A0A0] border-[#333]'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => setActiveTab('engineers')}
                className={`flex-1 py-1 px-2 text-[10px] font-bold uppercase tracking-wider rounded-xs text-center border ${
                  activeTab === 'engineers'
                    ? 'bg-[#d71920] text-white border-[#d71920]'
                    : 'bg-[#242424] text-[#A0A0A0] border-[#333]'
                }`}
              >
                Engineers
              </button>
              <button
                onClick={() => setActiveTab('personnel')}
                className={`flex-1 py-1 px-2 text-[10px] font-bold uppercase tracking-wider rounded-xs text-center border ${
                  activeTab === 'personnel'
                    ? 'bg-[#d71920] text-white border-[#d71920]'
                    : 'bg-[#242424] text-[#A0A0A0] border-[#333]'
                }`}
              >
                Personnel
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 py-1 px-2 text-[10px] font-bold uppercase tracking-wider rounded-xs text-center border ${
                  activeTab === 'users'
                    ? 'bg-[#d71920] text-white border-[#d71920]'
                    : 'bg-[#242424] text-[#A0A0A0] border-[#333]'
                }`}
              >
                Users
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

