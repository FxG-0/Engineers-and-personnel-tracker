import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { EngineersView } from './components/EngineersView';
import { PersonnelView } from './components/PersonnelView';
import { UsersView } from './components/UsersView';
import { MyRecordsView } from './components/MyRecordsView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { HardHat } from 'lucide-react';

function Dashboard() {
  const { currentUser, userRole, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'my-records' | 'admin-dashboard' | 'engineers' | 'personnel' | 'users'>('my-records');

  useEffect(() => {
    if (userRole === 'user') {
      setActiveTab('my-records');
    } else if (userRole === 'admin') {
      setActiveTab('admin-dashboard');
    }
  }, [userRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] text-[#141414] flex flex-col items-center justify-center space-y-4 font-mono">
        <div className="w-8 h-8 border-3 border-[#141414] border-t-[#d71920] rounded-full animate-spin" />
        <div className="text-center text-xs font-bold uppercase tracking-wider text-[#141414]">
          Initializing Firebase Auth & Checking Permissions...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] flex flex-col font-sans selection:bg-[#d71920] selection:text-white">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Sub-header Context Bar */}
      <div className="bg-white border-b-2 border-[#141414] px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-500 block">PROJECT ID</span>
              <span className="font-bold text-[#141414]">personnel-tracker-halliburton</span>
            </div>
            <div className="h-6 w-px bg-[#141414] opacity-30 hidden sm:block"></div>
            <div className="hidden sm:block">
              <span className="text-[9px] uppercase font-bold text-gray-500 block">ENVIRONMENT</span>
              <span className="font-bold text-[#d71920]">FIRESTORE_LIVE</span>
            </div>
            <div className="h-6 w-px bg-[#141414] opacity-30 hidden md:block"></div>
            <div className="hidden md:block">
              <span className="text-[9px] uppercase font-bold text-gray-500 block">ROLE PERMISSION</span>
              <span className={`font-bold uppercase ${userRole === 'admin' ? 'text-[#d71920]' : 'text-emerald-700'}`}>
                {userRole || 'USER'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold text-[#141414]">CONNECTED TO FIRESTORE</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'my-records' && <MyRecordsView />}
        {activeTab === 'admin-dashboard' && <AdminDashboardView />}
        {activeTab === 'engineers' && <EngineersView />}
        {activeTab === 'personnel' && <PersonnelView />}
        {activeTab === 'users' && <UsersView />}
      </main>

      {/* High Density Footer */}
      <footer className="border-t-2 border-[#141414] bg-white py-4 px-4 text-center text-xs font-mono text-[#141414] space-y-1">
        <p className="flex items-center justify-center gap-2 font-black uppercase tracking-wider text-[11px]">
          <HardHat className="w-4 h-4 text-[#d71920]" />
          <span>Halliburton Personnel Tracking System</span>
        </p>
        <p className="text-[10px] text-gray-600">
          Firestore Live Collections: <span className="text-[#d71920] font-bold">engineers</span> | <span className="text-[#d71920] font-bold">personnel</span> | <span className="text-[#d71920] font-bold">users</span>
        </p>
      </footer>
    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
