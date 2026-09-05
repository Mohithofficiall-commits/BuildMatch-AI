import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ThumbsUp, MessageCircle, AtSign, Repeat2, ShieldCheck, Info } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { fetchNotifications, markAllNotificationsRead } from '@/lib/data';
import type { Notification } from '@/lib/types';
import { DEMO_NOTIFICATIONS, type DemoNotification, timeAgo } from '@/lib/feed';
import type { ProfessionalRole } from '@/lib/portal';

type NotifItem = { type: string; title: string; message: string; read: boolean; link?: string | null; created_at: string };

const ICONS: Record<string, typeof Bell> = {
  like: ThumbsUp,
  comment: MessageCircle,
  mention: AtSign,
  repost: Repeat2,
  system: ShieldCheck,
  verified: ShieldCheck,
  request: Info,
};

export default function NotificationsBell({ role }: { role: ProfessionalRole }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [open, setOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await fetchNotifications(user.id);
      setItems((rows as Notification[]).slice(0, 10));
      setDemoMode(false);
    } catch {
      setDemoMode(true);
      setItems(role === 'engineer' ? (DEMO_NOTIFICATIONS as DemoNotification[]) : []);
    }
  }, [role, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = items.filter((n) => !n.read).length;

  const openPanel = () => {
    setOpen((v) => !v);
    if (!open && !demoMode && user && unread > 0) {
      void markAllNotificationsRead(user.id).catch(() => undefined);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    }
    if (!open && demoMode) {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  return (
    <div className="relative">
      <button
        onClick={openPanel}
        className="relative p-2 rounded-lg hover:bg-navy-50 text-navy-500 hover:text-navy-800 transition-colors"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9.5px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-[320px] sm:w-[360px] card overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-navy-100">
              <p className="font-bold text-navy-900 text-[15px]">Notifications</p>
              {demoMode && <span className="text-[10px] font-semibold text-royal-700 bg-royal-50 px-2 py-0.5 rounded-full">demo</span>}
            </div>
            <div className="max-h-[380px] overflow-y-auto no-scrollbar divide-y divide-navy-50">
              {items.length === 0 && (
                <p className="text-[13px] text-navy-400 text-center py-10">No notifications yet.</p>
              )}
              {items.map((n, i) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <button
                    key={`${n.created_at}-${i}`}
                    onClick={() => { setOpen(false); if (n.link) navigate(n.link); }}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-navy-50/70 transition-colors ${n.read ? '' : 'bg-royal-50/40'}`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.read ? 'bg-navy-100 text-navy-500' : 'bg-royal-100 text-royal-700'}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-navy-900 leading-snug">{n.title}</span>
                      <span className="block text-[12px] text-navy-500 leading-snug mt-0.5">{n.message}</span>
                      <span className="block text-[10.5px] text-navy-400 mt-1">{timeAgo(n.created_at)}</span>
                    </span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-royal-500 shrink-0 mt-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
