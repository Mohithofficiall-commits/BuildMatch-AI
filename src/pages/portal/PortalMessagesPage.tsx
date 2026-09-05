import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  fetchProjectMembersByUser, fetchEngineerByUserId, fetchProjects,
  fetchProfessionalRequestsJoined, fetchAppUsers, fetchMessages, sendMessage,
} from '@/lib/data';
import type { Project, Message, AppUser } from '@/lib/types';
import { LoadingState, EmptyState, Badge } from '@/components/ui';
import { projectStatus } from '@/components/professional/statuses';
import { MessageSquare, Send, Paperclip, Search, FolderKanban } from 'lucide-react';

export default function PortalMessagesPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    try {
      const [mems, reqs, allUsers, projs] = await Promise.all([
        fetchProjectMembersByUser(user.id).catch(() => []),
        fetchProfessionalRequestsJoined(user.id).catch(() => []),
        fetchAppUsers().catch(() => []),
        fetchProjects().catch(() => []),
      ]);
      setUsers(allUsers);
      const myIds = new Set<string>();
      for (const m of mems) if (m.project && m.status !== 'declined') myIds.add(m.project.id);
      for (const r of reqs) if ((r.status === 'accepted' || r.status === 'completed') && r.project) myIds.add(r.project.id);
      if (user.role === 'engineer') {
        const eng = await fetchEngineerByUserId(user.id).catch(() => null);
        if (eng) for (const p of projs) if (p.engineer_id === eng.id) myIds.add(p.id);
      }
      const list = projs.filter((p) => myIds.has(p.id));
      setProjects(list);
      setSelected((prev) => prev && list.some((p) => p.id === prev) ? prev : list[0]?.id ?? null);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void loadProjects(); }, [loadProjects]);

  useEffect(() => {
    if (!selected) return;
    (async () => { try { setMessages(await fetchMessages(selected)); } catch { /* ignore */ } })();
  }, [selected]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  if (!user) return <LoadingState text="Loading..." />;
  if (loading) return <LoadingState text="Loading conversations..." />;

  const current = projects.find((p) => p.id === selected);
  const filtered = search
    ? projects.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || (users.find((u) => u.id === p.homeowner_id)?.name ?? '').toLowerCase().includes(search.toLowerCase()))
    : projects;
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? 'Homeowner';

  const handleSend = async () => {
    if (!input.trim() || !selected || !user || !current) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      const msg = await sendMessage(selected, user.id, current.homeowner_id, user.role, content);
      setMessages((prev) => [...prev, msg]);
    } catch { /* ignore */ } finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Messages</h1>
        <p className="muted mt-1">Conversations with the homeowners on your projects</p>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-7 h-7" />}
          title="No conversations yet"
          description="Once you accept a project request or join a project, you can message the homeowner here."
        />
      ) : (
        <div className="card overflow-hidden flex h-[640px]">
          <div className="w-72 border-r border-navy-100 flex-col hidden md:flex shrink-0">
            <div className="p-3 border-b border-navy-100">
              <div className="relative">
                <Search className="w-4 h-4 text-navy-300 absolute left-3 top-1/2 -translate-y-1/2" />
                <input className="input pl-9 text-sm" placeholder="Search conversations..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => setSelected(p.id)} className={`w-full text-left p-3 border-b border-navy-50 transition-colors ${selected === p.id ? 'bg-royal-50' : 'hover:bg-navy-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center text-navy-600 text-xs font-bold shrink-0">
                      <FolderKanban className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-900 truncate">{p.title}</p>
                      <p className="text-xs muted truncate">{userName(p.homeowner_id)} · {p.location}</p>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-xs muted p-3">No matching conversations.</p>}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {current && (
              <div className="p-4 border-b border-navy-100 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900 truncate">{current.title}</p>
                  <p className="text-xs muted truncate">{userName(current.homeowner_id)} · {current.location}</p>
                </div>
                <Badge variant={projectStatus(current.status).variant}>{projectStatus(current.status).label}</Badge>
              </div>
            )}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-navy-50/30">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm muted">No messages yet. Start the conversation!</div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-royal-600 text-white' : 'bg-white border border-navy-100 text-navy-900'}`}>
                        <p className="text-sm">{m.content}</p>
                        {m.attachment_name && <div className={`flex items-center gap-1.5 mt-2 text-xs ${isMe ? 'text-royal-200' : 'text-royal-600'}`}><Paperclip className="w-3 h-3" /> {m.attachment_name}</div>}
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-royal-200' : 'muted'}`}>{new Date(m.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t border-navy-100 flex gap-2">
              <input className="input flex-1" placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} disabled={sending} />
              <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-primary px-4"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
