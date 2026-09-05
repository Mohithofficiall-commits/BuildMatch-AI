import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { roleLabel, type ProfessionalRole } from '@/lib/portal';
import { PORTAL_TABS } from './portalTabs';
import { HardHat, LogOut } from 'lucide-react';
import { onPersonImgError } from '@/lib/people';

export default function PortalLayout({ role }: { role: ProfessionalRole }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const tabs = PORTAL_TABS[role];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC]">
      {/* Top bar */}
      <header className="bg-white border-b border-navy-100 sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6">
          <div className="h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <NavLink to="/" className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center shrink-0">
                  <HardHat className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-navy-900 text-sm leading-tight truncate">BuildMatch AI</p>
                  <p className="text-[10px] text-royal-700 font-semibold capitalize leading-tight truncate">{roleLabel(role)} Workspace</p>
                </div>
              </NavLink>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {user?.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt=""
                  onError={(e) => onPersonImgError(e, user?.role)}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-soft"
                />
              )}
              <span className="hidden md:block text-sm font-semibold text-navy-900 truncate max-w-[160px]">{user?.name}</span>
              <button onClick={handleLogout} title="Sign out" className="p-2 rounded-lg hover:bg-navy-50 text-navy-400 hover:text-navy-700 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile horizontal nav */}
        <div className="lg:hidden border-t border-navy-100">
          <div className="px-2 overflow-x-auto no-scrollbar">
            <nav className="flex gap-1 py-1.5 w-max">
              {tabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all ${
                      isActive ? 'bg-navy-900 text-white shadow-soft' : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'
                    }`
                  }
                >
                  <t.icon className="w-4 h-4 shrink-0" />
                  {t.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto flex items-start">
        {/* Desktop sidebar nav (LinkedIn-style rail) */}
        <aside className="hidden lg:block w-60 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto no-scrollbar px-4 py-6 border-r border-navy-100 bg-white/60">
          <p className="text-[10px] font-bold tracking-widest uppercase text-navy-400 px-3 mb-3">My Workspace</p>
          <nav className="space-y-0.5">
            {tabs.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end}>
                {({ isActive }) => (
                  <span
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all ${
                      isActive
                        ? 'bg-navy-900 text-white shadow-soft'
                        : 'text-navy-600 hover:bg-navy-100/70 hover:text-navy-900'
                    }`}
                  >
                    <t.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? '' : 'text-navy-400'}`} />
                    {t.label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 mx-3 rounded-2xl bg-gradient-to-br from-royal-50 to-navy-50 border border-navy-100 p-3.5">
            <p className="text-xs font-bold text-navy-900">Professional Network</p>
            <p className="text-[11px] text-navy-500 leading-snug mt-1">Share project updates, exchange tips and grow your reputation with verified professionals across the build ecosystem.</p>
          </div>
        </aside>

        {/* Page content */}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
