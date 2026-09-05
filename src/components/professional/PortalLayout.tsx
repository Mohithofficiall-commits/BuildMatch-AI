import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { roleLabel, type ProfessionalRole } from '@/lib/portal';
import { PORTAL_TABS } from './portalTabs';
import { HardHat, LogOut } from 'lucide-react';

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
      {/* Portal top bar */}
      <div className="bg-white border-b border-navy-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center shrink-0">
                <HardHat className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-navy-900 text-sm leading-tight truncate">BuildMatch AI</p>
                <p className="text-[10px] text-royal-700 font-semibold capitalize leading-tight truncate">{roleLabel(role)} Workspace</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {user?.avatar_url && <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />}
              <span className="hidden md:block text-sm font-semibold text-navy-900 truncate max-w-[140px]">{user?.name}</span>
              <button onClick={handleLogout} title="Sign out" className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400 hover:text-navy-700 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="border-t border-navy-100">
          <div className="max-w-7xl mx-auto px-2 lg:px-6 overflow-x-auto no-scrollbar">
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
      </div>

      <Outlet />
    </div>
  );
}
