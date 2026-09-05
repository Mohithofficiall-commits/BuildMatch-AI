import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useCompare } from '@/lib/compare';
import {
  LayoutDashboard, Search, GitCompareArrows, Sparkles, FolderKanban,
  MessageSquare, FolderLock, Wallet, Star, AlertTriangle, FileBadge,
  LogOut, Menu, HardHat,
} from 'lucide-react';
import { useState } from 'react';
import { personPhoto, onPersonImgError } from '@/lib/people';

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/find-engineers', label: 'Find Engineers', icon: Search },
  { to: '/app/compare', label: 'Compare Engineers', icon: GitCompareArrows },
  { to: '/app/ai-match', label: 'AI Match', icon: Sparkles },
  { to: '/app/projects', label: 'My Projects', icon: FolderKanban },
  { to: '/app/messages', label: 'Messages', icon: MessageSquare },
  { to: '/app/documents', label: 'Document Vault', icon: FolderLock },
  { to: '/app/payments', label: 'Payments', icon: Wallet },
  { to: '/app/reviews', label: 'Reviews', icon: Star },
  { to: '/app/complaints', label: 'Complaints', icon: AlertTriangle },
  { to: '/app/digital-passport', label: 'Digital Passport', icon: FileBadge },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { engineerIds } = useCompare();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-navy-100">
        <NavLink to="/app/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-navy-900 flex items-center justify-center">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-navy-900 leading-tight">BuildMatch AI</p>
            <p className="text-[10px] muted leading-tight">Build Right. Build Trusted.</p>
          </div>
        </NavLink>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-navy-900 text-white shadow-soft'
                  : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.label === 'Compare Engineers' && engineerIds.length > 0 && (
              <span className="badge-royal text-[10px] px-1.5 py-0.5">{engineerIds.length}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-navy-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-navy-50">
          <img src={personPhoto(user?.avatar_url, user?.role)} alt="" onError={(e) => onPersonImgError(e, user?.role)} className="w-9 h-9 rounded-full object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-navy-900 truncate">{user?.name}</p>
            <p className="text-xs muted capitalize">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-white text-navy-400 hover:text-navy-700 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F8FC]">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-navy-100 hidden lg:block z-30">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 animate-fade-in-fast">
          <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl animate-slide-up">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-navy-100 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-navy-50">
            <Menu className="w-5 h-5 text-navy-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-navy-900 flex items-center justify-center">
              <HardHat className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-navy-900 text-sm">BuildMatch AI</span>
          </div>
          <img src={personPhoto(user?.avatar_url, user?.role)} alt="" onError={(e) => onPersonImgError(e, user?.role)} className="w-8 h-8 rounded-full object-cover" />
        </header>

        <main className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
